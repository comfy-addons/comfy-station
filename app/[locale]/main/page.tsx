'use client'

import { trpc } from '@/utils/trpc'
import { EGlobalEvent, useGlobalEvent } from '@/hooks/useGlobalEvent'
import { WorkflowCard } from '@/components/WorkflowCard'
import { useMemo } from 'react'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { cn } from '@/lib/utils'

/**
 * Current redirect to /auth/basic
 */
export default function Home() {
  const query = trpc.workflow.list.useInfiniteQuery(
    {
      limit: 10
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor
    }
  )

  useGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW, () => {
    query.refetch()
  })
  const dyn = useDynamicValue([1230, 1656])

  const renderCards = useMemo(() => {
    const items = query.data?.pages.map((v) => v.items).flat()
    return items?.map((item, i) => <WorkflowCard data={item} key={item.id} />)
  }, [query.data])

  return (
    <div className='absolute w-full h-full overflow-y-auto pb-16'>
      <div
        className={cn('w-full h-fit p-2 gap-2 grid', {
          'grid-cols-4': dyn([false, false, true]),
          'grid-cols-3': dyn([false, true, false]),
          'grid-cols-1 md:grid-cols-2': dyn([true, false, false])
        })}
      >
        {renderCards}
      </div>
    </div>
  )
}
