import { Workflow } from '@/entities/workflow'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { trpc } from '@/utils/trpc'
import { MiniBadge } from './MiniBadge'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu'
import { CopyPlus, DownloadCloud, PenBox, Pencil, Trash2 } from 'lucide-react'
import { LoadableButton } from './LoadableButton'
import { useToast } from '@/hooks/useToast'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { EUserRole, EWorkflowActiveStatus } from '@/entities/enum'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/style'
import { AttachmentImage } from './AttachmentImage'
import { Loaded } from '@mikro-orm/core'
import { useWorkflowStore } from '@/states/workflow'
import { DropdownMenuSeparator } from './ui/dropdown-menu'
import { useTranslations } from 'next-intl'

export const WorkflowCard: IComponent<{
  data: Loaded<Workflow, 'avatar' | 'author', '*', 'rawWorkflow'>
}> = ({ data }) => {
  const t = useTranslations('components.workflowCard')
  const stator = trpc.workflowTask.workflowTaskStats.useQuery(data.id)
  const statusChanger = trpc.workflow.changeStatus.useMutation()
  const downloader = trpc.workflow.getRawWorkflow.useMutation()
  const duplicator = trpc.workflow.duplicate.useMutation()
  const { setShowDialog, setTargetWfId } = useWorkflowStore()
  const router = useRouter()
  const session = useSession()
  const { toast } = useToast()

  const handlePressActive = async () => {
    await statusChanger.mutateAsync({
      id: data.id,
      status: EWorkflowActiveStatus.Activated
    })
    toast({
      title: t('toast.activated')
    })
    dispatchGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW)
  }

  const handlePressDuplicate = async () => {
    const newWf = await duplicator.mutateAsync(data.id)
    toast({
      title: t('toast.duplicated')
    })
    dispatchGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW)
  }

  const handleDownloadWorkflow = async () => {
    const workflowJson = await downloader.mutateAsync(data.id)
    const blob = new Blob([workflowJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.download = `${data.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePressDelete = async () => {
    await statusChanger.mutateAsync({
      id: data.id,
      status: EWorkflowActiveStatus.Deleted
    })
    toast({
      title: 'Workflow Deleted'
    })
    dispatchGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW)
  }

  const handlePressEdit = () => {
    setTargetWfId(data.id)
    setShowDialog(true)
  }

  const handlePresHide = async () => {
    await statusChanger.mutateAsync({
      id: data.id,
      status: EWorkflowActiveStatus.Deactivated
    })
    toast({
      title: 'Workflow Deactivated'
    })
    dispatchGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW)
  }

  trpc.watch.workflow.useSubscription(data.id, {
    onData: () => stator.refetch(),
    enabled: data.status === EWorkflowActiveStatus.Activated
  })

  return (
    <ContextMenu>
      <ContextMenuTrigger
        disabled={session.data!.user.role < EUserRole.Editor}
        className='h-fit flex-1 w-full !pb-0 shadow rounded-xl relative'
      >
        <Card
          onClick={() => router.push(`/main/workflow/${data.id}`)}
          className={cn('shadow-none cursor-pointer hover:shadow-lg transition-all overflow-hidden')}
        >
          <CardHeader className='w-full aspect-video bg-secondary rounded-b-xl shadow-inner relative p-0 overflow-hidden'>
            <div className='absolute right-2 top-2 z-10'>
              <MiniBadge
                dotClassName={stator.data?.isExecuting ? 'bg-orange-500' : 'bg-gray-500'}
                className='bg-white text-zinc-800 border-none'
                title={stator.data?.isExecuting ? t('status.executing') : t('status.idle')}
              />
            </div>
            <AttachmentImage
              alt={data.name || ''}
              preferredSize='preview'
              className='w-full h-full'
              containerClassName={cn('!mt-0 transition-all', {
                'blur-xl opacity-50': data.status !== EWorkflowActiveStatus.Activated
              })}
              data={data.avatar}
            />
            {data.status !== EWorkflowActiveStatus.Activated && (
              <div className='!mt-0 rounded-none flex absolute top-0 left-0 w-full h-full items-center gap-4 justify-center'>
                {data.status === EWorkflowActiveStatus.Deactivated && (
                  <EyeSlashIcon className={'w-6 h-6 text-orange-400'} />
                )}
                {data.status === EWorkflowActiveStatus.Deleted && <Trash2 className={'w-6 h-6 text-destructive'} />}
                <div className='flex flex-col'>
                  <span className='font-bold uppercase text-sm'>{data.status}</span>
                  {data.status === EWorkflowActiveStatus.Deactivated && (
                    <p className='text-xs text-left max-w-52'>{t('deactivatedHint')}</p>
                  )}
                  {data.status === EWorkflowActiveStatus.Deleted && (
                    <p className='text-xs text-left max-w-52'>{t('deletedHint')}</p>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className='pt-4 pb-2 px-2'>
            <CardTitle>{data.name}</CardTitle>
            <CardDescription className='line-clamp-2 h-10'>{data.description}</CardDescription>
          </CardContent>
          <CardFooter className='px-2 pb-2 flex gap-1'>
            <MiniBadge dotClassName='bg-green-500' title={t('stats.executed')} count={stator.data?.success} />
            <MiniBadge dotClassName='bg-destructive' title={t('stats.failed')} count={stator.data?.failed} />
            <p className='text-sm ml-auto text-border'>@{data.author.email.split('@')[0]}</p>
          </CardFooter>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {data.status !== EWorkflowActiveStatus.Deleted && (
          <ContextMenuItem>
            <LoadableButton
              onClick={handlePressEdit}
              loading={statusChanger.isPending}
              variant='ghost'
              size='sm'
              className='justify-start p-0 w-full'
            >
              <PenBox className='w-4 h-4 mr-2' />
              {t('actions.edit')}
            </LoadableButton>
          </ContextMenuItem>
        )}
        {session.data?.user.role !== EUserRole.User && (
          <ContextMenuItem>
            <LoadableButton
              onClick={handleDownloadWorkflow}
              loading={downloader.isPending}
              variant='ghost'
              size='sm'
              className='justify-start p-0 w-full'
            >
              <DownloadCloud className='w-4 h-4 mr-2' />
              {t('actions.download')}
            </LoadableButton>
          </ContextMenuItem>
        )}
        {session.data?.user.role !== EUserRole.User && (
          <ContextMenuItem>
            <LoadableButton
              onClick={handlePressDuplicate}
              loading={duplicator.isPending}
              variant='ghost'
              size='sm'
              className='justify-start p-0 w-full'
            >
              <CopyPlus className='w-4 h-4 mr-2' />
              {t('actions.duplicate')}
            </LoadableButton>
          </ContextMenuItem>
        )}
        <DropdownMenuSeparator />
        {data.status !== EWorkflowActiveStatus.Activated && (
          <ContextMenuItem className='text-primary'>
            <LoadableButton
              onClick={handlePressActive}
              loading={statusChanger.isPending}
              variant='ghost'
              size='sm'
              className='justify-start p-0 w-full'
            >
              <EyeIcon className='w-4 h-4 mr-2' />
              {t('actions.activate')}
            </LoadableButton>
          </ContextMenuItem>
        )}
        {data.status !== EWorkflowActiveStatus.Deactivated && (
          <ContextMenuItem className='text-orange-400'>
            <LoadableButton
              onClick={handlePresHide}
              loading={statusChanger.isPending}
              variant='ghost'
              size='sm'
              className='justify-start p-0 w-full'
            >
              <EyeSlashIcon className='w-4 h-4 mr-2' />
              {t('actions.deactivate')}
            </LoadableButton>
          </ContextMenuItem>
        )}

        {data.status !== EWorkflowActiveStatus.Deleted && (
          <ContextMenuItem className='text-destructive'>
            <LoadableButton
              onClick={handlePressDelete}
              loading={statusChanger.isPending}
              variant='ghost'
              size='sm'
              className='justify-start p-0 w-full'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              {t('actions.delete')}
            </LoadableButton>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
