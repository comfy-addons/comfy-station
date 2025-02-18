'use client'

import { trpc } from '@/utils/trpc'
import { EGlobalEvent, useGlobalEvent } from '@/hooks/useGlobalEvent'
import { WorkflowCard } from '@/components/WorkflowCard'
import { useEffect, useMemo, useRef } from 'react'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { cn } from '@/utils/style'
import { EWorkflowActiveStatus } from '@/entities/enum'
import { PenOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useOnScreen } from '@/hooks/useOnScreen'
import { useActionDebounce } from '@/hooks/useAction'
import { LoadingSVG } from '@/components/svg/LoadingSVG'

/**
 * Current redirect to /auth/basic
 */
export default function Home() {
  const t = useTranslations('main')
  const query = trpc.workflow.list.useInfiniteQuery(
    {
      limit: 10
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor
    }
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const isBottomOnScreen = useOnScreen(bottomRef)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query

  useGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW, () => {
    query.refetch()
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const dyn = useDynamicValue([950, 1256], undefined, containerRef)
  const debounce = useActionDebounce(300, true)

  const renderCards = useMemo(() => {
    const items = query.data?.pages.map((v) => v.items).flat()
    return items?.map((item, i) => <WorkflowCard data={item} key={item.id} />) ?? []
  }, [query.data])

  useEffect(() => {
    if (isBottomOnScreen && hasNextPage && !isFetchingNextPage) {
      debounce(() => {
        fetchNextPage?.()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBottomOnScreen, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className='absolute w-full h-full overflow-y-auto pb-16'>
      {!renderCards.length && (
        <div ref={containerRef} className='flex h-full flex-col items-center justify-center text-foreground/50'>
          <PenOff className='w-6 h-6 mx-auto my-2' />
          <span className='uppercase'>{t('emptyWorkflow.title')}</span>
          <p className='text-xs'>{t('emptyWorkflow.description')}</p>
        </div>
      )}
      {!!renderCards.length && (
        <div
          ref={containerRef}
          className={cn('w-full h-fit p-2 gap-2 grid', {
            'grid-cols-4': dyn([false, false, true]),
            'grid-cols-3': dyn([false, true, false]),
            'grid-cols-1 md:grid-cols-2': dyn([true, false, false])
          })}
        >
          {renderCards}
        </div>
      )}
      <div
        id='bottom'
        ref={bottomRef}
        className={cn('w-full flex items-center justify-center mt-4 pt-4 pb-24 text-gray-400', {
          hidden: renderCards.length === 0
        })}
      >
        {isFetchingNextPage && (
          <div className='flex gap-2 items-center justify-center'>
            <LoadingSVG width={24} height={24} /> Loading...
          </div>
        )}
      </div>
    </div>
  )
}
