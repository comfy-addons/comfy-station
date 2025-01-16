import { BackendENV } from '@/env'
import { Redis } from 'ioredis'

export class RedisService {
  private static instance: RedisService
  public redis: Redis
  /**
   * For subscription only
   */
  public subRedis: Redis

  static getInstance() {
    if (typeof window !== 'undefined') return null
    if (!BackendENV.REDIS_HOST) return null
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  private constructor() {
    this.redis = new Redis({
      port: BackendENV.REDIS_PORT,
      host: BackendENV.REDIS_HOST,
      password: BackendENV.REDIS_PASSWORD
    })
    this.subRedis = new Redis({
      port: BackendENV.REDIS_PORT,
      host: BackendENV.REDIS_HOST,
      password: BackendENV.REDIS_PASSWORD
    })

    // Handle error events
    this.redis.on('error', (err) => {
      console.error('Redis error:', err)
    })
    this.subRedis.on('error', (err) => {
      console.error('Redis error:', err)
    })
  }
}
