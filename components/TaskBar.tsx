import { useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { ETaskStatus, EValueType } from '@/entities/enum'
import { WorkflowTask } from '@/entities/workflow_task'
import { cn } from '@/utils/style'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { trpc } from '@/utils/trpc'
import { TimeAgoSpan } from './TimeAgo'
import { AttachmentImage } from './AttachmentImage'

interface ITaskBarProps {
  className?: string
  tasks: WorkflowTask[]
  total?: number
  loading?: boolean
}

const getStatusColor = (status?: ETaskStatus) => {
  const colors = {
    [ETaskStatus.Pending]: 'bg-zinc-300/80',
    [ETaskStatus.Parent]: 'bg-zinc-300/90',
    [ETaskStatus.Queuing]: 'bg-zinc-300',
    [ETaskStatus.Running]: 'bg-orange-400',
    [ETaskStatus.Success]: 'bg-green-400',
    [ETaskStatus.Failed]: 'bg-destructive'
  }
  return status ? colors[status] : 'bg-zinc-300/50'
}

export const TaskBarItem: IComponent<{ task: WorkflowTask; animationDelay?: number }> = ({
  task,
  animationDelay = 0
}) => {
  const t = useTranslations('components.taskBar')
  const { data: taskDetails } = trpc.workflowTask.get.useQuery(task?.id, {
    enabled: !!task?.id
  })
  const reviewAttachments = Object.values(taskDetails?.outputValues ?? {}).find(
    (v) => v.type === EValueType.Image
  )?.value
  const reviewAttachment = (Array.isArray(reviewAttachments) ? reviewAttachments[0] : reviewAttachments) as
    | string
    | undefined

  const latestEvent = taskDetails?.events?.[0]

  return (
    <Tooltip>
      <TooltipTrigger className='w-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-transparent'>
        <div
          style={{ animationDelay: `${animationDelay}ms` }}
          className={cn(
            'aspect-[1/5] flex-1 rounded cursor-pointer',
            'group-hover:scale-90 hover:!scale-100',
            'animate-fade animate-once animate-ease-in-out duration-500',
            getStatusColor(task?.status)
          )}
          role='status'
          aria-label={t('status', { status: task?.status || 'empty' })}
        />
      </TooltipTrigger>
      <TooltipContent className='p-3 max-w-xs bg-black/50 backdrop-blur border'>
        {!task ? (
          <p className='text-sm'>{t('emptyTask')}</p>
        ) : (
          <div className='flex flex-row gap-2'>
            <AttachmentImage alt='review' className='aspect-square rounded shadow' data={{ id: reviewAttachment }} />
            <div className='flex flex-col gap-2'>
              <div>
                <p className='font-bold text-sm whitespace-nowrap'>{t('taskId', { id: task.id.split('-').pop() })}</p>
                <p className='text-xs text-white/50'>
                  {t('lastUpdated', { time: new Date(task.updateAt).toLocaleString() })}
                </p>
              </div>
              <div>
                {task.status === ETaskStatus.Parent ? (
                  <p className='text-xs uppercase font-bold'>{t('parentTask')}</p>
                ) : (
                  <p className='text-xs uppercase font-bold'>{t('status', { status: task.status })}</p>
                )}
                {latestEvent?.details && (
                  <p className='text-xs mt-1 text-muted-foreground'>{t('detail', { message: latestEvent.details })}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export const TaskBar: IComponent<ITaskBarProps> = ({ className, tasks, total = 30, loading = false }) => {
  const t = useTranslations('components.taskBar')
  const animationRef = useRef(0)
  const lastItem = tasks.at(0)

  const renderTasks = useMemo(() => {
    animationRef.current = 0
    return Array(total)
      .fill(0)
      .map((_, i) => {
        const task = tasks[i]
        animationRef.current++

        if (loading) {
          return (
            <Skeleton
              key={`task-skeleton-${i}`}
              style={{ animationDelay: `${animationRef.current * 10}ms` }}
              className='aspect-[1/5] w-full rounded'
            />
          )
        }

        return <TaskBarItem key={`task-${i}`} task={task} animationDelay={animationRef.current * 10} />
      })
  }, [total, tasks, loading])

  return (
    <div className={cn('flex flex-col w-full gap-3', className)}>
      <div className='flex justify-between items-center'>
        <span className='text-xs font-bold text-secondary-foreground'>{t('lastTasks', { count: total })}</span>
      </div>
      <div className='flex gap-1 flex-row-reverse group' role='list' aria-label={t('lastTasks', { count: total })}>
        {renderTasks}
      </div>
      {lastItem ? (
        <TimeAgoSpan
          prefix={t('lastExecuted')}
          className='text-xs font-light text-muted-foreground -mt-2'
          date={new Date(lastItem.updateAt)}
        />
      ) : (
        t('nothingExecuted')
      )}
    </div>
  )
}
