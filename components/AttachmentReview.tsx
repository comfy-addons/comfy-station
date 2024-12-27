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
import LoadableImage from './LoadableImage'
import { useEffect, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { forceRecalculatePortal, Portal } from './Portal'
import { useStateSyncDebounce } from '@/hooks/useStateSyncDebounce'
import { useClipboardCopyFn } from '@/hooks/useClipboardCopyFn'

import { AddonDiv } from './AddonDiv'
import useMobile from '@/hooks/useMobile'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AttachmentDetail } from './AttachmentDetail'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog'
import { useTargetRefById } from '@/hooks/useTargetRefById'
import useCurrentMousePosRef from '@/hooks/useCurrentMousePos'
import { useEngineStore } from '@/states/engine'
import { useScrollingStatusRef } from '@/hooks/useScrollingStatus'

const AttachmentTooltipPopup: IComponent<{
  taskId?: string
  active: boolean
}> = ({ taskId, active }) => {
  const { data: detail } = trpc.workflowTask.detail.useQuery(taskId!, {
    enabled: !!taskId && active,
    refetchOnWindowFocus: false
  })
  const { copy } = useClipboardCopyFn()
  return (
    <div className='p-1 text-foreground'>
      <div className='flex flex-col justify-between max-w-[420px] text-justify p-2'>
        <code className='font-bold'>Workflow</code>
        <span>{detail?.workflow.name}</span>
      </div>
      {!!detail?.inputValues &&
        Object.entries(detail.inputValues).map(([key, value], idx) => (
          <AddonDiv
            key={key}
            onDoubleClick={() => copy(String(value))}
            className={cn(
              'flex flex-col justify-between max-w-[420px] break-words p-2 even:bg-secondary/50 hover:opacity-80 cursor-pointer active:opacity-100'
            )}
          >
            <code className='font-bold pointer-events-none'>{key}</code>
            <span className='pointer-events-none'>{value}</span>
          </AddonDiv>
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
  const isMobile = useMobile()
  const {
    current: { x }
  } = useCurrentMousePosRef()

  const ref = useRef<HTMLDivElement>(null)
  const scrollingRef = useScrollingStatusRef()
  const portalRef = useTargetRefById<HTMLDivElement>('portal-me')

  const [floatLeft, setFloatLeft] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const [hoverSync, setHoverSync] = useState(isHovering)
  const [mouseSync] = useStateSyncDebounce(isHovering, 500)
  const [previewUrl, setPreviewUrl] = useState<string>()

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

  trpc.watch.preview.useSubscription(
    { taskId: taskId! },
    {
      onData: (base64PngBuffer) => {
        // Convert base64 to png url for image src
        setPreviewUrl(`data:image/png;base64,${base64PngBuffer}`)
      },
      enabled: !!taskId && loading
    }
  )

  useEffect(() => {
    forceRecalculatePortal()
  }, [hoverSync])

  useEffect(() => {
    const timeOut = setTimeout(() => {
      if (ref.current && !ref.current.matches(':hover')) {
        setIsHovering(false)
        setHoverSync(false)
      } else {
        setHoverSync(isHovering)
      }
    }, 1000)
    return () => clearTimeout(timeOut)
  }, [isHovering])

  const imageLoaded = !loading && (!isLoading || !enabled)
  const isPop = hoverSync && isHovering && !isMobile

  useEffect(() => {
    if (ref.current) {
      setFloatLeft(x > window.innerWidth / 2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouseSync])

  if (mode === 'image') {
    return (
      <div
        ref={ref}
        onMouseMove={() => {
          if (!scrollingRef.current && !isHovering) setIsHovering(true)
        }}
        onMouseLeave={() => {
          setIsHovering(false)
        }}
        className={cn(
          'w-16 h-16 rounded-xl cursor-pointer transition-all bg-secondary overflow-hidden relative group hover:outline',
          className
        )}
      >
        <PhotoView src={image?.high?.url}>
          <div className='w-full h-full'>
            <Portal to={portalRef} disabled={!isPop} target={ref} castOverlay wrapperCls='w-full h-full'>
              <div className='w-full h-full relative'>
                <m.div
                  className={cn('w-full h-full', {
                    'rounded-tl-lg rounded-bl-lg': isPop
                  })}
                  initial={{ scale: 1 }}
                  animate={isPop ? { scale: 1.15, translateZ: 0 } : { scale: 1, translateZ: 0 }}
                >
                  <LoadableImage
                    loading={!previewUrl && (loading || isLoading)}
                    src={image?.preview?.url || previewUrl}
                    alt={shortName}
                    className={cn('w-full h-full object-cover transition-all will-change-transform', {
                      'bg-background': isPop && !previewUrl && (loading || isLoading),
                      'animate-pulse': !isPop && !!previewUrl && (loading || isLoading),
                      'rounded-lg outline shadow cursor-pointer': isPop
                    })}
                  />
                </m.div>
                {isPop && (
                  <m.div
                    className={cn('absolute min-h-full -z-10', {
                      'pr-[100%]': floatLeft,
                      'pl-[100%]': !floatLeft
                    })}
                    style={{
                      top: -(ref.current?.clientHeight ?? 100) * 0.075,
                      left: floatLeft ? undefined : (ref.current?.clientWidth ?? 100) * 0.075,
                      right: floatLeft ? (ref.current?.clientWidth ?? 100) * 0.075 : undefined
                    }}
                    initial={{ translateX: floatLeft ? 100 : -100 }}
                    animate={{ translateX: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className={cn({
                        'ml-4': !floatLeft,
                        'mr-4': floatLeft
                      })}
                    >
                      <div
                        style={{ height: (ref.current?.clientHeight ?? 100) * 1.15 }}
                        className='relative w-[340px] overflow-auto min-h-[400px] bg-background/50 backdrop-blur-xl rounded-lg border'
                      >
                        <AttachmentTooltipPopup taskId={taskId} active={hoverSync && isHovering} />
                      </div>
                      <div className='w-full mt-2 h-10 flex justify-end gap-2'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild className='flex items-center'>
                            <Button variant='secondary' className='bg-background/50 backdrop-blur-lg'>
                              <code>DOWNLOAD</code> <Download width={16} height={16} className='ml-2' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side='left' className='bg-background/80 backdrop-blur-lg'>
                            <DropdownMenuItem onClick={() => downloadFn('jpg')} className='cursor-pointer text-sm'>
                              <span>Download compressed JPG</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadFn()} className='cursor-pointer text-sm'>
                              <span>Download Raw</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {!!onPressFavorite && (
                          <Button
                            onClick={() => onPressFavorite?.(data?.id!)}
                            variant='secondary'
                            className='bg-background/50 backdrop-blur-lg'
                          >
                            <code>FAVORITE</code>
                            <Star
                              width={16}
                              height={16}
                              className={cn('ml-2', {
                                'fill-zinc-200 stroke-zinc-200': !isFavorited,
                                'fill-yellow-500 stroke-yellow-500': isFavorited
                              })}
                            />
                          </Button>
                        )}
                      </div>
                    </div>
                  </m.div>
                )}
              </div>
            </Portal>
          </div>
        </PhotoView>
        {isMobile && (
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
        )}
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
        {!imageLoaded && !previewUrl && <LoadingSVG width={16} height={16} className='repeat-infinite' />}
        {previewUrl && <AvatarImage src={previewUrl} alt={shortName} />}
        {imageLoaded && shortName}
      </AvatarFallback>
    </Avatar>
  )
}
