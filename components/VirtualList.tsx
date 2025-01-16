import React, { CSSProperties, useCallback, useEffect, useRef } from 'react'
import { VirtualItem, useVirtualizer } from '@tanstack/react-virtual'
import { delay } from '@/utils/tools'
import { useActionDebounce, useActionThreshold } from '@/hooks/useAction'
import { cn } from '@/utils/style'

export type VirtualListProps<T> = {
  className?: string
  style?: CSSProperties
  itemClassName?: string
  itemStyle?: CSSProperties
  items: T[]
  getItemKey: (item: T, index: number) => string | number
  renderItem: (item: T, virtualItem: VirtualItem) => React.ReactNode
  estimateSize: (index: number) => number
  overscan?: number
  renderEmpty?: () => React.ReactNode
  onFetchMore?: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

const PADDING_BOTTOM = 64

export function VirtualList<T>({
  style,
  itemStyle,
  items,
  getItemKey,
  estimateSize,
  renderItem,
  hasNextPage,
  renderEmpty,
  isFetchingNextPage,
  overscan,
  onFetchMore
}: VirtualListProps<T>) {
  const isAtBottom = useRef(false)
  const firstLoaded = useRef(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollPosRef = useRef(0)
  const { onAction } = useActionThreshold(1000)

  const getItemKeyCallback = useCallback((index: number) => getItemKey(items[index]!, index), [getItemKey, items])

  const virtualizer = useVirtualizer({
    count: items.length,
    getItemKey: getItemKeyCallback,
    getScrollElement: () => scrollableRef.current,
    estimateSize,
    overscan
  })

  useEffect(
    () => {
      if (items.length > 0 && !firstLoaded.current) {
        virtualizer.scrollToOffset(virtualizer.getTotalSize() + PADDING_BOTTOM)
        firstLoaded.current = true
        return
      }
      if (isAtBottom.current) {
        virtualizer.scrollToOffset(virtualizer.getTotalSize() + PADDING_BOTTOM)
      } else if (scrollableRef.current) {
        virtualizer.scrollToOffset(virtualizer.getTotalSize() - scrollPosRef.current)
        virtualizer?.measure?.()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  )

  useEffect(() => {
    if (virtualizer.isScrolling) {
      const scrollOffset = virtualizer.scrollOffset ?? 0
      const scrollHeight = virtualizer.getTotalSize()

      scrollPosRef.current = scrollHeight - scrollOffset
      isAtBottom.current = scrollPosRef.current < 60
    }
  }, [virtualizer, virtualizer.isScrolling, virtualizer.scrollOffset])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (firstLoaded.current) {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target.id === 'bottom' && hasNextPage && !isFetchingNextPage) {
              onAction(() => onFetchMore?.())
            }
          }
        })
      }
    })
    if (bottomRef.current) {
      observer.observe(bottomRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, onAction, onFetchMore])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column-reverse',
        ...style
      }}
    >
      <div
        ref={scrollableRef}
        style={{
          height: '100%',
          overflow: 'auto'
        }}
      >
        {items.length === 0 && (
          <div className='absolute top-0 left-0 w-full h-full flex items-center justify-center'>
            {renderEmpty?.() || <span className='text-foreground/50 uppercase'>Empty</span>}
          </div>
        )}
        <div
          style={{
            width: '100%',
            position: 'relative',
            height: virtualizer.getTotalSize() + PADDING_BOTTOM
          }}
        >
          <div id='bottom' ref={bottomRef} />
          <div
            className='divide-y divide-secondary px-2'
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              transform: `translateY(${virtualItems[0]?.start ?? 0}px)`
            }}
          >
            {virtualItems.map((virtualItem) => {
              const item = items[virtualItem.index]!
              return (
                <div
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={itemStyle}
                  className={cn({
                    'bg-background': virtualItem.index % 2 === 0,
                    'bg-secondary/20': virtualItem.index % 2 !== 0
                  })}
                >
                  {renderItem(item, virtualItem)}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
