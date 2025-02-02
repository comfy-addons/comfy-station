import { ClientInfoMonitoring } from '@/components/ClientInfoMonitoring'
import { AddClientDialog } from '@/components/dialogs/AddClientDialog'
import { MiniBadge } from '@/components/MiniBadge'
import { TaskBar } from '@/components/TaskBar'
import { TaskBigStat } from '@/components/TaskBigStat'
import { UserInformation } from '@/components/UserInformation'
import { WorkflowTask } from '@/entities/workflow_task'
import { EGlobalEvent, useGlobalEvent } from '@/hooks/useGlobalEvent'
import { trpc } from '@/utils/trpc'
import { ServerOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export const AdminSideInfo: IComponent = () => {
  const t = useTranslations('components.adminSideInfo')
  const [tasks, setTasks] = useState<WorkflowTask[]>()
  const [taskStats, setTaskStats] = useState<{ pending: number; executed: number }>()
  const [clientStats, setClientStats] = useState<{ online: number; offline: number; error: number }>()

  const { data: clients, refetch: reloadClients } = trpc.client.list.useQuery()

  trpc.task.lastTasks.useSubscription(
    { limit: 30 },
    {
      onData: (data) => {
        setTasks(data)
      }
    }
  )
  trpc.client.overview.useSubscription(undefined, {
    onData: (data) => {
      setClientStats(data)
    }
  })

  trpc.task.countStats.useSubscription(undefined, {
    onData: (data) => {
      setTaskStats(data)
    }
  })

  useGlobalEvent(EGlobalEvent.RLOAD_CLIENTS, reloadClients)

  return (
    <div className='w-full h-full flex flex-col items-start'>
      <div className='w-full hidden md:block py-2'>
        <UserInformation />
      </div>
      <div className='flex w-full flex-row md:flex-col gap-6 p-2 md:p-4 items-center'>
        <div className='flex md:w-full flex-col md:flex-row justify-around gap-2'>
          <TaskBigStat
            loading={!taskStats}
            title={t('taskPending')}
            count={taskStats?.pending || 0}
            activeNumber={{
              className: 'text-orange-500'
            }}
          />
          <TaskBigStat loading={!taskStats} title={t('taskExecuted')} count={taskStats?.executed || 0} />
        </div>
        <div className='flex-1 md:w-full'>
          <TaskBar loading={tasks === undefined} tasks={tasks || []} />
          <div className='flex md:hidden flex-col gap-2 py-2 w-full items-center'>
            <div className='flex gap-2'>
              {!!clientStats && (
                <>
                  <MiniBadge title={t('status.online')} dotClassName='bg-green-500' count={clientStats.online} />
                  <MiniBadge title={t('status.offline')} dotClassName='bg-zinc-600' count={clientStats.offline} />
                  <MiniBadge title={t('status.error')} dotClassName='bg-red-500' count={clientStats.error} />
                </>
              )}
            </div>
            <AddClientDialog />
          </div>
        </div>
      </div>
      <div className='flex-1 w-full flex flex-col shadow-inner border-t border-b relative'>
        {!clients?.length && (
          <div className='flex flex-1 flex-col items-center justify-center text-foreground/50'>
            <ServerOff className='w-6 h-6 mx-auto my-2' />
            <span className='uppercase'>{t('emptyServer.title')}</span>
            <p className='text-xs'>{t('emptyServer.description')}</p>
          </div>
        )}
        <div className='absolute w-full h-full overflow-auto divide-y-[1px]'>
          {clients?.map((client) => <ClientInfoMonitoring key={client.id} client={client} />)}
        </div>
      </div>
      <div className='md:flex hidden gap-2 p-2 w-full items-center'>
        {!!clientStats && (
          <>
            <MiniBadge title={t('status.online')} dotClassName='bg-green-500' count={clientStats.online} />
            <MiniBadge title={t('status.offline')} dotClassName='bg-zinc-600' count={clientStats.offline} />
            <MiniBadge title={t('status.error')} dotClassName='bg-red-500' count={clientStats.error} />
          </>
        )}
        <AddClientDialog />
      </div>
    </div>
  )
}
