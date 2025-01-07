import { Client } from '@/entities/client'
import { EClientAction, EClientStatus } from '@/entities/enum'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'
import { TMonitorEvent } from '@saintno/comfyui-sdk'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MonitoringStat } from './MonitoringStat'

import { ArrowPathIcon, CircleStackIcon, CpuChipIcon, TrashIcon } from '@heroicons/react/24/outline'
import { HamburgerMenuIcon, ReloadIcon, SquareIcon } from '@radix-ui/react-icons'
import { TaskBar } from './TaskBar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { LoadableButton } from './LoadableButton'
import { OverflowText } from './OverflowText'
import { SimpleTransitionLayout } from './SimpleTranslation'
import { useToast } from '@/hooks/useToast'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'
import { TriangleAlertIcon } from 'lucide-react'
import { WorkflowTask } from '@/entities/workflow_task'

export const ClientInfoMonitoring: IComponent<{
  client: Client
}> = ({ client }) => {
  const { toast } = useToast()
  const [isDoingAction, setDoingAction] = useState(false)
  const [status, setStatus] = useState<EClientStatus>()
  const [clientTasks, setClientTasks] = useState<WorkflowTask[]>()
  const [monitoring, setMonitoring] = useState<TMonitorEvent>()

  trpc.task.lastTasks.useSubscription(
    {
      clientId: client.id,
      limit: 20
    },
    {
      onData: (data) => {
        setClientTasks(data)
      }
    }
  )

  trpc.client.monitorSystem.useSubscription(client.id, {
    onData: (data) => {
      setMonitoring(data)
    }
  })
  trpc.client.monitorStatus.useSubscription(client.id, {
    onData: (data) => {
      setStatus(data)
    }
  })

  const deleter = trpc.client.delete.useMutation()
  const { mutateAsync } = trpc.client.control.useMutation()

  const handlePressAction = async (mode: EClientAction) => {
    setDoingAction(true)
    mutateAsync({
      clientId: client.id,
      mode
    }).finally(() => {
      setDoingAction(false)
    })
  }

  const handlePressDelete = async () => {
    setDoingAction(true)
    deleter
      .mutateAsync(client.host)
      .then(() => {
        dispatchGlobalEvent(EGlobalEvent.RLOAD_CLIENTS)
        toast({
          description: 'Client deleted successfully'
        })
      })
      .catch(() => {
        toast({
          description: 'Failed to delete client',
          variant: 'destructive'
        })
      })
      .finally(() => {
        setDoingAction(false)
      })
  }

  const renderStats = useMemo(() => {
    if (status === EClientStatus.Offline)
      return (
        <div className='h-full flex justify-center items-center text-foreground/20 font-bold px-4'>
          <span>OFFLINE</span>
        </div>
      )
    if (status === EClientStatus.Error)
      return (
        <div className='h-full flex flex-col gap-2 justify-center items-center text-destructive/20 font-bold px-4'>
          <TriangleAlertIcon width={24} height={24} />
          <span>ERROR</span>
        </div>
      )
    if (!monitoring) return null
    return (
      <>
        <MonitoringStat
          icon={<CpuChipIcon width={12} height={12} />}
          title='CPU'
          value={`${monitoring.cpu_utilization}%`}
        />
        <MonitoringStat
          icon={<CircleStackIcon width={12} height={12} />}
          title='RAM'
          value={`${monitoring.ram_used_percent}%`}
        />
        {monitoring.gpus.map((gpu, idx) => {
          return [
            <MonitoringStat
              key={'GPU_UL' + idx}
              icon={<CpuChipIcon width={12} height={12} />}
              title={`GPU ${idx + 1}`}
              value={`${gpu.gpu_utilization}%`}
            />,
            <MonitoringStat
              key={'GPU_RAM' + idx}
              icon={<CircleStackIcon width={12} height={12} />}
              title={`VRAM ${idx + 1}`}
              value={`${Number(gpu.vram_used_percent).toFixed(2)}%`}
            />
          ]
        })}
      </>
    )
  }, [monitoring, status])

  return (
    <div className='w-full flex flex-row min-h-[120px]'>
      <div className='flex-1 flex flex-row'>
        <div className='flex-1 flex flex-col p-2 gap-3'>
          <div className='flex gap-2 w-full'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className='flex items-center'>
                <LoadableButton loading={isDoingAction} variant='outline' size='icon' className='aspect-square'>
                  <HamburgerMenuIcon width={16} height={16} />
                </LoadableButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side='bottom' align='start' className='w-48'>
                <DropdownMenuItem onClick={() => handlePressAction(EClientAction.RESTART)} className='cursor-pointer'>
                  <ArrowPathIcon className='mr-2' width={16} height={16} />
                  <span className='min-w-[100px]'>Reboot</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePressAction(EClientAction.FREE_MEMORY)}
                  className='cursor-pointer'
                >
                  <TrashIcon className='mr-2' width={16} height={16} />
                  <span className='min-w-[100px]'>Free VRAM</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePressAction(EClientAction.FORCE_RECONNECT)}
                  className='cursor-pointer'
                >
                  <ReloadIcon className='mr-2' width={16} height={16} />
                  <span className='min-w-[100px]'>Force reconnect</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={status !== EClientStatus.Executing}
                  className='text-destructive cursor-pointer'
                  onClick={() => handlePressAction(EClientAction.INTERRUPT)}
                >
                  <SquareIcon className='mr-2' width={16} height={16} />
                  <span className='min-w-[100px]'>Cancel current task</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='text-destructive cursor-pointer' onClick={handlePressDelete}>
                  <TrashIcon className='mr-2' width={16} height={16} />
                  <span className='min-w-[100px]'>Delete this client</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className='flex flex-col flex-auto'>
              <OverflowText className='uppercase text-sm font-bold max-w-[170px] text-left'>
                {client.name || `NODE #${client.id.slice(0, 4)}`}
              </OverflowText>
              <a href={client.host} target='__blank' className='transition-all text-xs relative h-4 w-full justify-center items-center'>
                <OverflowText className='w-full absolute text-left'>{client.host}</OverflowText>
              </a>
            </div>
          </div>
          <TaskBar className='max-w-[200px]' tasks={clientTasks || []} loading={clientTasks === undefined} total={20} />
        </div>
        <SimpleTransitionLayout
          deps={[String(status === EClientStatus.Offline)]}
          className='h-full p-2 flex flex-col gap-1 min-w-fit'
        >
          {renderStats}
        </SimpleTransitionLayout>
      </div>
      <div
        className={cn('w-2 transition-all', {
          'bg-green-500': status === EClientStatus.Online,
          'bg-zinc-500': status === EClientStatus.Offline,
          'bg-destructive': status === EClientStatus.Error,
          'bg-orange-500': status === EClientStatus.Executing
        })}
      />
    </div>
  )
}
