'use client'

import { trpc } from '@/utils/trpc'
import { EGlobalEvent, useGlobalEvent } from '@/hooks/useGlobalEvent'
import { WorkflowCard } from '@/components/WorkflowCard'
import { useMemo } from 'react'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { cn } from '@/utils/style'
import { EWorkflowActiveStatus } from '@/entities/enum'
import { PenOff } from 'lucide-react'

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
    const items = query.data?.pages
      .map((v) => v.items)
      .flat()
      .sort((a, b) => {
        // De-active last
        if (a.status === b.status) return 0
        if (a.status === EWorkflowActiveStatus.Activated) return -1
        return 1
      })
    return items?.map((item, i) => <WorkflowCard data={item} key={item.id} />) ?? []
  }, [query.data])

  if (!renderCards.length) {
    return (
      <div className='flex h-full flex-col items-center justify-center text-foreground/50'>
        <PenOff className='w-6 h-6 mx-auto my-2' />
        <span className='uppercase'>Workflow is empty</span>
        <p className='text-xs'>Create your first workflow</p>
      </div>
    )
  }

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
