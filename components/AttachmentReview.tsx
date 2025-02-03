import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { LoadingSVG } from './svg/LoadingSVG'
import { trpc } from '@/utils/trpc'
import { Attachment } from '@/entities/attachment'
import { cn } from '@/utils/style'
import { PhotoView } from 'react-photo-view'
import { Button } from './ui/button'
import { Download, ImageIcon, MoreHorizontal, Star } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import LoadableImage from './LoadableImage'
import { useEffect, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { Portal } from './Portal'
import { useStateSyncDebounce } from '@/hooks/useStateSyncDebounce'
import { useTranslations } from 'next-intl'

import { AddonDiv } from './AddonDiv'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { AttachmentDetail } from './AttachmentDetail'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog'
import { useTargetRefById } from '@/hooks/useTargetRefById'
import useCurrentMousePosRef from '@/hooks/useCurrentMousePos'
import useCopyAction from '@/hooks/useCopyAction'
import { EValueType } from '@/entities/enum'
import { PlayCircleIcon } from '@heroicons/react/24/outline'
import { useTouchDevice } from '@/hooks/useTouchDevice'
import { EKeyboardKey, useShortcutKeyEvent } from '@/hooks/useShortcutKeyEvent'
import { AttachmentImage } from './AttachmentImage'

const AttachmentTooltipPopup: IComponent<{
  taskId?: string
  active: boolean
}> = ({ taskId, active }) => {
  const t = useTranslations('components.attachmentDetail')
  const { data: detail } = trpc.workflowTask.detail.useQuery(taskId!, {
    enabled: !!taskId && active,
    refetchOnWindowFocus: false
  })
  const { copyToClipboard } = useCopyAction()
  return (
    <div className='py-1 text-foreground'>
      <div className='flex flex-col justify-between max-w-[420px] text-justify p-2'>
        <code className='font-bold'>{t('workflow')}</code>
        <span>{detail?.workflow.name}</span>
      </div>
      {!!detail?.inputValues &&
        Object.entries(detail.inputValues).map(([key, value], idx) => {
          const type = detail.workflow.mapInput?.[key]?.type
          if (type === EValueType.Image || type === EValueType.Video) {
            const inputData = Array.isArray(value) ? value : ([value] as string[])
            return inputData.map((id) => (
              <AddonDiv
                key={`${key}-${id}`}
                className={cn(
                  'flex flex-col justify-between max-w-[420px] break-words even:bg-secondary/50 hover:opacity-80 cursor-pointer active:opacity-100'
                )}
              >
                <code className='font-bold pointer-events-none px-2 pt-2 pb-1'>{key}</code>
                <AttachmentImage containerClassName='w-full min-h-[120px]' alt='sources' key={key} data={{ id }} />
              </AddonDiv>
            ))
          }
          return (
            <AddonDiv
              key={key}
              title={t('downloadTitle')}
              onDoubleClick={() => copyToClipboard(String(value), t('copyValue'))}
              className={cn(
                'flex flex-col justify-between max-w-[420px] break-words p-2 even:bg-secondary/50 hover:opacity-80 cursor-pointer active:opacity-100'
              )}
            >
              <code className='font-bold pointer-events-none'>{key}</code>
              <span className='pointer-events-none'>{value}</span>
            </AddonDiv>
          )
        })}
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
  const t = useTranslations('components.attachmentDetail')
  const enabled = !!data?.id
  const isTouchDevice = useTouchDevice()
  const {
    current: { x }
  } = useCurrentMousePosRef()

  const ref = useRef<HTMLDivElement>(null)
  const portalRef = useTargetRefById<HTMLDivElement>('portal-me')

  const [floatLeft, setFloatLeft] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [mouseSync] = useStateSyncDebounce(showDetail, 0)

  const { data: image, isLoading } = trpc.attachment.get.useQuery(
    {
      id: data?.id!
    },
    {
      enabled,
      staleTime: Infinity
    }
  )

  const isVideo = image?.type === EValueType.Video

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

  useShortcutKeyEvent(EKeyboardKey.Escape, () => {
    setShowDetail(false)
  })

  const imageLoaded = !loading && (!isLoading || !enabled)
  const isPop = showDetail && !isTouchDevice

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
        onContextMenu={(e) => {
          e.preventDefault()
          setShowDetail(true)
        }}
        className={cn(
          'w-16 h-16 rounded-xl cursor-pointer transition-all bg-secondary overflow-hidden relative group hover:outline',
          className
        )}
      >
        <PhotoView src={image?.high?.url}>
          <div className='w-full h-full'>
            <Portal
              onClickOutside={() => setShowDetail(false)}
              to={portalRef}
              disabled={!isPop}
              target={ref}
              castOverlay
              followScroll
              wrapperCls='w-full h-full'
            >
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
                      'rounded-lg outline outline-white shadow cursor-pointer': isPop
                    })}
                  />
                  {isPop && (
                    <m.div className='mt-2' onClick={(e) => e.stopPropagation()}>
                      {!!image && (
                        <div className='px-2 py-1 text-xs bg-background/50 border backdrop-blur w-min rounded flex justify-center gap-1'>
                          {image.type === EValueType.Video ? (
                            <PlayCircleIcon className='w-4 h-4' />
                          ) : (
                            <ImageIcon className='w-4 h-4' />
                          )}
                          <code>{image?.type}</code>
                        </div>
                      )}
                    </m.div>
                  )}
                </m.div>
                {isPop && (
                  <m.div
                    className={cn('absolute min-h-full -z-10', {
                      'mr-[100%]': floatLeft,
                      'ml-[100%]': !floatLeft
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
                        <AttachmentTooltipPopup taskId={taskId} active={showDetail} />
                      </div>
                      <div className='w-full mt-2 h-10 flex justify-end gap-2'>
                        {isVideo ? (
                          <Button
                            variant='secondary'
                            onClick={() => downloadFn()}
                            className='bg-background/50 backdrop-blur-lg'
                          >
                            <code>{t('download')}</code> <Download width={16} height={16} className='ml-2' />
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild className='flex items-center'>
                              <Button variant='secondary' className='bg-background/50 backdrop-blur-lg'>
                                <code>{t('download')}</code> <Download width={16} height={16} className='ml-2' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              data-is-popover-content
                              side='left'
                              className='bg-background/80 backdrop-blur-lg'
                            >
                              <DropdownMenuItem onClick={() => downloadFn('jpg')} className='cursor-pointer text-sm'>
                                <span>{t('downloadHigh')}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadFn()} className='cursor-pointer text-sm'>
                                <span>{t('downloadRaw')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {!!onPressFavorite && (
                          <Button
                            onClick={() => onPressFavorite?.(data?.id!)}
                            variant='secondary'
                            className='bg-background/50 backdrop-blur-lg'
                          >
                            <code>{t('favorite')}</code>
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
        {isTouchDevice && (
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
                      <DialogTitle className='text-base font-bold'>{t('detail')}</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>{t('detail')}</DialogDescription>
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
                    <span>{t('downloadHigh')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadFn()} className='cursor-pointer text-sm'>
                    <span>{t('downloadRaw')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        {!!image && (
          <div
            className={cn(
              'z-10 group-hover:block absolute bottom-2 left-2 bg-black/50 text-white backdrop-blur rounded p-1'
            )}
          >
            {image.type === EValueType.Video ? (
              <PlayCircleIcon className='w-4 h-4' />
            ) : (
              <ImageIcon className='w-4 h-4' />
            )}
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
