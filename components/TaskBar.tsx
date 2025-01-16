import { useMemo, useRef } from 'react'

import { ETaskStatus } from '@/entities/enum'
import { WorkflowTask } from '@/entities/workflow_task'
import { cn } from '@/utils/style'
import { Skeleton } from '@/components/ui/skeleton'

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { trpc } from '@/utils/trpc'

interface ITaskBarProps {
  className?: string
  tasks: WorkflowTask[]
  total?: number
  loading?: boolean
}

export const TaskBarItem: IComponent<{ task: WorkflowTask; animationDelay?: number }> = ({
  task,
  animationDelay = 0
}) => {
  const detailer = trpc.workflowTask.get.useQuery(task?.id, {
    enabled: !!task?.id
  })
  const latestEv = detailer.data?.events.length ? detailer.data.events?.[0] : undefined
  return (
    <Tooltip>
      <TooltipTrigger className='w-full transition-all hover:scale-110'>
        <div
          style={{
            animationDelay: `${animationDelay}ms`
          }}
          className={cn(
            'aspect-[1/5] flex-1 rounded group-hover:scale-90 hover:!scale-100 animate-fade animate-once animate-ease-in-out duration-500',
            {
              'bg-zinc-300/50': !task,
              'bg-zinc-300/80': task?.status === ETaskStatus.Pending,
              'bg-zinc-300/90': task?.status === ETaskStatus.Parent,
              'bg-zinc-300': task?.status === ETaskStatus.Queuing,
              'bg-orange-400': task?.status === ETaskStatus.Running,
              'bg-green-400': task?.status === ETaskStatus.Success,
              'bg-destructive': task?.status === ETaskStatus.Failed
            }
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {!task && <p>Task is empty</p>}
        {!!task && (
          <div className='flex flex-col gap-1'>
            <p className='font-bold'>TaskID #{task.id}</p>
            <p className='text-xs'>Last updated at {task.updateAt.toLocaleString()}</p>
            {task.status !== ETaskStatus.Parent && (
              <p className='text-xs uppercase font-bold mt-2'>STATUS {task.status}</p>
            )}
            {task.status === ETaskStatus.Parent && <p className='text-xs uppercase font-bold mt-2'>PARENT TASK</p>}
            {!!latestEv?.details && <p className='text-xs'>Detail: {latestEv.details}</p>}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export const TaskBar: IComponent<ITaskBarProps> = ({ className, tasks, total = 30, loading = false }) => {
  const animtionRef = useRef(0)
  const lastItem = tasks[tasks.length - 1]

  const renderTick = useMemo(() => {
    animtionRef.current = 0
    return Array(total)
      .fill(0)
      .map((_, i) => {
        const task = tasks[i]
        animtionRef.current++

        if (loading) {
          return (
            <Skeleton
              key={i}
              style={{
                animationDelay: `${animtionRef.current * 10}ms`
              }}
              className='aspect-[1/5] w-full rounded'
            />
          )
        }

        return <TaskBarItem key={i} task={task} animationDelay={animtionRef.current * 10} />
      })
  }, [total, tasks, loading])

  return (
    <div className={cn('flex flex-col w-full gap-2', className)}>
      <span className='text-xs font-bold text-secondary-foreground'>LAST {total} TASK</span>
      <div className='flex gap-1 flex-row-reverse group'>{renderTick}</div>
      {!!lastItem && (
        <span className='ml-auto text-xs font-light'>
          Last executed at {new Date(lastItem.updateAt).toLocaleString()}
        </span>
      )}
      {!lastItem && <span className='ml-auto text-xs font-light opacity-50'>Nothing executed yet</span>}
    </div>
  )
}
