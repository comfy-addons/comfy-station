import { Attachment } from '@/entities/attachment'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ReactNode, useEffect, useRef } from 'react'
import { AttachmentReview } from './AttachmentReview'
import { useActionDebounce, useActionThreshold } from '@/hooks/useAction'
import { useOnScreen } from '@/hooks/useOnScreen'
import { cn } from '@/utils/style'
import { useTranslations } from 'next-intl'

type TLoadableAttachment = Attachment | { id: string; loading: boolean }

export const ImageGallery: IComponent<{
  items: Array<TLoadableAttachment>
  favoriteIds?: string[]
  onFetchMore?: () => void
  imgPerRow?: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  className?: string
  renderEmpty?: () => ReactNode
  onPressSetAvatar?: (imageId: string) => void
}> = ({
  items,
  hasNextPage,
  className,
  isFetchingNextPage,
  onPressSetAvatar,
  onFetchMore,
  renderEmpty,
  favoriteIds,
  imgPerRow = 3
}) => {
  const t = useTranslations('components.gallery')
  const parentRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstLoaded = useRef(false)
  const debounce = useActionDebounce(300, true)
  const isBottomOnScreen = useOnScreen(bottomRef)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    getItemKey: (i) => {
      const item = items[i]
      if ('loading' in item) {
        return i
      }
      return (items[i] as Attachment)?.id ?? i
    },
    overscan: 10,
    lanes: imgPerRow
  })

  useEffect(() => {
    if (items.length > 0 && !firstLoaded.current) {
      firstLoaded.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useEffect(() => {
    if (isBottomOnScreen && hasNextPage && !isFetchingNextPage) {
      debounce(() => {
        onFetchMore?.()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBottomOnScreen, hasNextPage, isFetchingNextPage, onFetchMore])

  return (
    <>
      <div
        ref={parentRef}
        className={cn('List group', className)}
        style={{
          height: `100%`,
          width: `100%`,
          overflow: 'auto',
          scrollBehavior: 'smooth'
        }}
      >
        {items.length === 0 && (
          <div className='w-full h-full flex items-center justify-center'>
            {renderEmpty?.() || <span className='text-foreground/50 uppercase'>{t('isEmpty.title')}</span>}
          </div>
        )}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow, idx) => {
            const item = items[virtualRow.index]!
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={'animate-fade duration-200 p-1 hover:z-10 isolate'}
                style={{
                  animationDelay: `${idx * 34}ms`,
                  position: 'absolute',
                  top: 0,
                  left: `${(virtualRow.lane * 100) / imgPerRow}%`,
                  width: `calc(100%/${imgPerRow})`,
                  height: 'fit-content',
                  aspectRatio: 'loading' in item ? 1 : item.ratio || 1,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {!('loading' in item) && (
                  <AttachmentReview
                    key={item.id}
                    isAvatar={favoriteIds?.includes(item.id)}
                    taskId={item.task as any as string}
                    onPressSetAvatar={onPressSetAvatar}
                    className='w-full h-full object-cover'
                    tryPreview
                    data={item}
                    shortName='NA'
                  />
                )}
                {'loading' in item && (
                  <AttachmentReview key={item.id} taskId={item.id} loading className='w-full h-full object-cover' />
                )}
              </div>
            )
          })}
        </div>
        <div
          id='bottom'
          ref={bottomRef}
          className={cn('w-full flex items-center justify-center mt-4 pt-4 pb-24 text-gray-400', {
            hidden: items.length === 0
          })}
        >
          {hasNextPage && <div className='flex'>{t('dataStatus.more')}</div>}
          {isFetchingNextPage && <div className='flex'>{t('dataStatus.loading')}</div>}
          {!isFetchingNextPage && !hasNextPage && <div className='flex'>{t('dataStatus.noMore')}</div>}
        </div>
      </div>
    </>
  )
}
