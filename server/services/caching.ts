import { EClientStatus } from '@/entities/enum'
import { TMonitorEvent } from '@saintno/comfyui-sdk'
import { Logger } from '@saintno/needed-tools'
import { LRUCache } from 'lru-cache'

import { RedisService } from './redis'

export type TCachingKeyMap = {
  CLIENT_STATUS: CustomEvent<EClientStatus>
  SYSTEM_MONITOR: CustomEvent<TMonitorEvent>
  LAST_TASK_CLIENT: CustomEvent<number>
  PREVIEW: CustomEvent<{ blob64: string }>
  HISTORY_LIST: CustomEvent<number>
  HISTORY_ITEM: CustomEvent<number>
  HISTORY_ITEM_PREVIEW: CustomEvent<Blob>
  WORKFLOW: CustomEvent<number>
  USER_BALANCE: CustomEvent<number>
  USER_NOTIFICATION: CustomEvent<number>
  USER_EXECUTING_TASK: CustomEvent<number>
}

enum ECachingType {
  MEMORY = 'memory',
  REDIS = 'redis'
}

class CachingService extends EventTarget {
  private logger: Logger
  private cache:
    | {
        type: ECachingType.MEMORY
        client: LRUCache<string, string>
      }
    | {
        type: ECachingType.REDIS
        client: RedisService
      }

  static getInstance() {
    if (!(global as any).__CachingService__) {
      ;(global as any).__CachingService__ = new CachingService()
    }
    return (global as any).__CachingService__ as CachingService
  }

  private constructor() {
    super()
    this.logger = new Logger('CachingService')

    // Check if Redis is available
    const rdInst = RedisService.getInstance()
    if (rdInst) {
      // Use Redis as the caching mechanism
      this.cache = {
        type: ECachingType.REDIS,
        client: rdInst
      }
      this.logger.i('init', 'Use Redis as the caching mechanism')
      rdInst.subRedis.on('message', (channel, message) => {
        this.dispatchEvent(new CustomEvent(channel, { detail: JSON.parse(message) }))
      })
    } else {
      // Use in-memory cache
      this.cache = {
        type: ECachingType.MEMORY,
        client: new LRUCache({
          ttl: 1000 * 60 * 60, // 1 Hour cache
          max: 1000, // Maximum 1000 items
          ttlAutopurge: true
        })
      }
      this.logger.i('init', 'Use memory as the caching mechanism')
    }
  }

  async set(category: keyof TCachingKeyMap, id: string | number, value: any) {
    const key = `${category}:${id}`
    switch (this.cache.type) {
      case ECachingType.MEMORY: {
        this.dispatchEvent(new CustomEvent(key, { detail: value }))
        this.dispatchEvent(
          new CustomEvent(category, {
            detail: {
              id,
              value
            }
          })
        )
        this.cache.client.set(key, JSON.stringify(value))
        break
      }
      case ECachingType.REDIS: {
        await Promise.all([
          this.cache.client.redis.publish(key, JSON.stringify(value)),
          this.cache.client.redis.publish(category, JSON.stringify({ id, value })),
          this.cache.client.redis.set(key, JSON.stringify(value))
        ])
      }
    }
  }

  async get<K extends keyof TCachingKeyMap>(
    category: K,
    id: string | number
  ): Promise<TCachingKeyMap[K]['detail'] | null> {
    const key = `${category}:${id}`
    const value =
      this.cache.type === ECachingType.MEMORY ? this.cache.client.get(key) : await this.cache.client.redis.get(key)
    if (!value) return null
    return JSON.parse(value)
  }

  /**
   * Registers an event listener for a specific category and id.
   *
   * @template K - The type of the category key.
   * @param {K} category - The category key.
   * @param {string | number} id - The id of the event.
   * @param {(event: TCachingKeyMap[K]) => void} callback - The callback function to be executed when the event is triggered.
   * @param {AddEventListenerOptions | boolean} [options] - The options for the event listener.
   * @returns {() => void} - A function that can be called to remove the event listener.
   */
  public on<K extends keyof TCachingKeyMap>(
    category: K,
    id: string | number,
    callback: (event: TCachingKeyMap[K]) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void {
    const key = `${category}:${id}`
    this.addEventListener(key, callback as any, options)

    // If the cache is not an instance of LRUCache, we need to subscribe to the cache
    if (this.cache.type === ECachingType.REDIS) {
      const cacher = this.cache.client
      cacher.subRedis.subscribe(key)
      return () => {
        this.off(category, id, callback)
        cacher.subRedis.unsubscribe(key)
      }
    }
    return () => {
      this.off(category, id, callback)
    }
  }

  public onCategory<K extends keyof TCachingKeyMap>(
    category: K,
    callback: (
      event: CustomEvent<{
        id: string | number
        value: TCachingKeyMap[K]['detail']
      }>
    ) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void {
    this.addEventListener(category, callback as any, options)
    if (this.cache.type === ECachingType.REDIS) {
      const cacher = this.cache.client
      cacher.subRedis.subscribe(category)
      return () => {
        this.offCategory(category, callback)
        cacher.subRedis.unsubscribe(category)
      }
    }
    return () => {
      this.offCategory(category, callback)
    }
  }

  public offCategory<K extends keyof TCachingKeyMap>(
    category: K,
    callback: (
      event: CustomEvent<{
        id: string | number
        value: TCachingKeyMap[K]['detail']
      }>
    ) => void
  ) {
    this.removeEventListener(category, callback as any)
  }

  /**
   * Removes an event listener for a specific category and ID.
   *
   * @template K - The type of the category key.
   * @param {K} category - The category key.
   * @param {string | number} id - The ID of the event listener.
   * @param {(event: TCachingKeyMap[K]) => void} callback - The callback function to be removed.
   */
  public off<K extends keyof TCachingKeyMap>(
    category: K,
    id: string | number,
    callback: (event: TCachingKeyMap[K]) => void
  ) {
    const key = `${category}:${id}`
    this.removeEventListener(key, callback as any)
  }

  onGenerator = async function* <T extends keyof TCachingKeyMap>(
    key: T,
    id: string | number,
    signal?: AbortSignal
  ): AsyncGenerator<TCachingKeyMap[T]> {
    while (!signal?.aborted) {
      // Create a promise that resolves when the event occurs
      const event = await new Promise<TCachingKeyMap[T]>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error('Generator aborted'))
          return
        }
        signal?.addEventListener('abort', () => reject(new Error('Generator aborted')))
        CachingService.getInstance().on(key, id, resolve, { once: true })
      })
      yield event
    }
  }

  onCategoryGenerator = async function* <T extends keyof TCachingKeyMap>(
    key: T,
    signal?: AbortSignal
  ): AsyncGenerator<
    CustomEvent<{
      id: string | number
      value: TCachingKeyMap[T]['detail']
    }>
  > {
    while (!signal?.aborted) {
      // Create a promise that resolves when the event occurs
      const event = await new Promise<
        CustomEvent<{
          id: string | number
          value: TCachingKeyMap[T]['detail']
        }>
      >((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error('Generator aborted'))
          return
        }
        signal?.addEventListener('abort', () => reject(new Error('Generator aborted')))
        CachingService.getInstance().onCategory(key, resolve, { once: true })
      })
      yield event
    }
  }
}

export default CachingService
