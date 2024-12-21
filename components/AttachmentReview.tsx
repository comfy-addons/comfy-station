import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { LoadingSVG } from './svg/LoadingSVG'
import { trpc } from '@/utils/trpc'
import { Attachment } from '@/entities/attachment'
import { cn } from '@/lib/utils'
import { PhotoView } from 'react-photo-view'
import { Button } from './ui/button'
import { Download, MoreHorizontal, Star } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { AttachmentDetail } from './AttachmentDetail'
import LoadableImage from './LoadableImage'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { TooltipPopup } from './TooltipPopup'

const AttachmentTooltipPopup: IComponent<{
  taskId?: string
  active: boolean
}> = ({ taskId, active }) => {
  const { data: detail } = trpc.workflowTask.detail.useQuery(taskId!, { enabled: !!taskId && active })

  return (
    <div className='p-2 text-foreground text-sm'>
      <code className='font-medium uppercase'>Configuration</code>
      <div className='flex flex-col justify-between max-w-[420px] text-justify p-2'>
        <code className='font-bold'>Workflow</code>
        <span>{detail?.workflow.name}</span>
      </div>
      {!!detail?.inputValues &&
        Object.entries(detail.inputValues).map(([key, value], idx) => (
          <div
            key={key}
            className={cn('flex flex-col justify-between max-w-[420px] break-words p-2', {
              'bg-secondary/50': idx % 2 === 0
            })}
          >
            <code className='font-bold'>{key}</code>
            <span>{value}</span>
          </div>
        ))}
    </div>
  )
}

export const AttachmentReview: IComponent<{
  shortName?: string
  data?: Attachment | { id: string }
  mode?: 'avatar' | 'image'
  onClick?: () => void
  onPressFavorite?: (imageId: string) => void
  isFavorited?: boolean
  loading?: boolean
  className?: string
  taskId?: string
  tryPreview?: boolean
}> = ({
  data,
  mode = 'image',
  shortName = 'N/A',
  onClick,
  className,
  isFavorited,
  loading,
  taskId,
  onPressFavorite
}) => {
  const enabled = !!data?.id
  const { data: image, isLoading } = trpc.attachment.get.useQuery(
    {
      id: data?.id!
    },
    {
      enabled,
      staleTime: Infinity
    }
  )

  const downloadFn = (mode: 'jpg' | 'raw' = 'raw') => {
    if (mode === 'raw') {
      window.open(image?.raw?.url, '_blank')
    } else {
      window.open(image?.high?.url, '_blank')
    }
  }
  const imageLoaded = !loading && (!isLoading || !enabled)

  if (mode === 'image') {
    return (
      <div
        className={cn('w-16 h-16 rounded-xl cursor-pointer btn bg-secondary overflow-hidden relative group', className)}
      >
        <PhotoView src={image?.high?.url}>
          <TooltipPopup
            containerCls='mt-auto h-auto overflow-y-auto'
            className='w-full h-full flex items-center justify-center'
            tooltipContent={(active) => <AttachmentTooltipPopup taskId={taskId} active={active} />}
          >
            <LoadableImage
              loading={loading || isLoading}
              src={image?.preview?.url}
              alt={shortName}
              className='w-full h-full object-cover'
            />
          </TooltipPopup>
        </PhotoView>
        {!!onPressFavorite && (
          <div
            className={cn('z-10 group-hover:block absolute top-1 left-1', {
              hidden: !isFavorited
            })}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => onPressFavorite?.(data?.id!)} size='icon' variant='ghost'>
                  <Star
                    width={24}
                    height={24}
                    className={cn({
                      'fill-zinc-200 stroke-zinc-200': !isFavorited,
                      'fill-yellow-500 stroke-yellow-500': isFavorited
                    })}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='right'
                className='max-w-[128px] bg-background text-foreground z-10 border p-2 flex flex-col'
              >
                Set as thumbnail for this workflow
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <div className={cn('z-10 absolute bottom-1 right-1')}>
          <div className='relative w-fit h-fit'>
            <Dialog modal>
              <DialogTrigger className='z-10'>
                <div className={cn('p-2 bg-background text-foreground rounded-lg btn')}>
                  <MoreHorizontal width={16} height={16} />
                </div>
              </DialogTrigger>
              <DialogContent className='max-w-full p-0 overflow-hidden md:w-[calc(100vw-20px)] h-full md:h-[calc(100vh-20px)] bg-background flex flex-col'>
                <VisuallyHidden>
                  <DialogHeader>
                    <DialogTitle className='text-base font-bold'>Attachment Detail</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>Attachment Detail</DialogDescription>
                </VisuallyHidden>
                {!!data && (
                  <AttachmentDetail
                    onPressDownloadHigh={() => downloadFn('jpg')}
                    onPressDownloadRaw={() => downloadFn('raw')}
                    imageURL={image?.high?.url}
                    attachment={data}
                  />
                )}
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger className='flex items-center'>
                <div className={cn('z-10 p-2 bg-background text-foreground rounded-lg btn')}>
                  <Download width={16} height={16} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side='left'>
                <DropdownMenuItem onClick={() => downloadFn('jpg')} className='cursor-pointer text-sm'>
                  <span>Download compressed JPG</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadFn()} className='cursor-pointer text-sm'>
                  <span>Download Raw</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Avatar onClick={onClick} className={cn('w-16 h-16 rounded-none cursor-pointer btn', className)}>
      {imageLoaded && <AvatarImage src={!image ? undefined : image?.preview?.url || undefined} alt={shortName} />}
      <AvatarFallback
        className={cn('rounded-none uppercase', className, {
          'animate-pulse': loading
        })}
      >
        {!imageLoaded && <LoadingSVG width={16} height={16} className='repeat-infinite' />}
        {imageLoaded && shortName}
      </AvatarFallback>
    </Avatar>
  )
}
