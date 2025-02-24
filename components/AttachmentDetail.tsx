import { trpc } from '@/utils/trpc'
import { Attachment } from '@/entities/attachment'
import { cn } from '@/utils/style'
import { Button } from './ui/button'
import { Download, Tag } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnScreen } from '@/hooks/useOnScreen'
import { EValueType, EValueUtilityType } from '@/entities/enum'
import { isArray } from 'lodash'
import LoadableImage from './LoadableImage'
import { IconPicker } from './IconPicker'
import { IMapperInput } from '@/entities/workflow'
import { useTranslations } from 'next-intl'
import { AttachmentImage } from './AttachmentImage'
import { MultiSelect } from './ui-ext/multi-select'

export const AttachmentDetail: React.FC<{
  attachment: Attachment | { id: string }
  imageURL?: string
  onPressDownloadHigh?: () => void
  onPressDownloadRaw?: () => void
}> = ({ attachment, imageURL, onPressDownloadHigh, onPressDownloadRaw }) => {
  const [crrTags, setCrrTags] = useState<string[]>([])
  const t = useTranslations('components.attachmentDetail')
  const viewRef = useRef<HTMLDivElement>(null)
  const isVisible = useOnScreen(viewRef)

  const { data: detail, isLoading } = trpc.attachment.taskDetail.useQuery(attachment?.id!, {
    enabled: attachment?.id !== undefined && isVisible,
    staleTime: Infinity
  })

  const { data: allTags, refetch: refetchTags } = trpc.attachmentTag.list.useQuery(undefined, {
    enabled: !!attachment?.id && isVisible
  })

  const tagData = trpc.attachmentTag.getAttachmentTags.useQuery(attachment.id, {
    enabled: !!attachment?.id && isVisible
  })

  const tagMutFn = trpc.attachmentTag.setAttachmentTags.useMutation({
    onSuccess: () => tagData.refetch()
  })

  const createTag = trpc.attachmentTag.create.useMutation({
    onSuccess: () => refetchTags()
  })

  const configMap = detail?.workflow?.mapInput || {}
  const config = detail?.task?.inputValues || {}

  const renderMapperInput = useCallback((config: IMapperInput, inputVal: any) => {
    const value = inputVal || config.default
    if ([EValueType.Image, EValueType.Video].includes(config.type as EValueType)) {
      let src = value
      if (isArray(src) && src.length === 1) {
        src = src[0]
      }
      return (
        <div className='flex flex-col'>
          <strong>{config.key}</strong>
          <div className='flex flex-wrap gap-2 mt-2'>
            {isArray(src) &&
              src.map((v) => (
                <AttachmentImage
                  alt='Input image'
                  containerClassName='w-32 h-32'
                  className='rounded-lg'
                  key={v}
                  data={{ id: v }}
                />
              ))}
            {!isArray(src) && (
              <AttachmentImage
                zoomable
                zoomableProps={{ wrapperClass: 'max-h-[30vh] md:max-h-[400px] rounded-lg' }}
                alt='Input image'
                className='w-full h-auto'
                key={src}
                data={{ id: src }}
              />
            )}
          </div>
        </div>
      )
    }
    return (
      <div className='flex flex-col'>
        <div className='flex gap-2 items-center'>
          {!!config.iconName && <IconPicker readonly value={config.iconName} />}
          <strong>{config.key}</strong>
        </div>
        <span className='break-words'>{value}</span>
      </div>
    )
  }, [])

  useEffect(() => {
    if (tagData.data) {
      setCrrTags(tagData.data.map((t) => t.id))
    }
  }, [tagData.data])

  return (
    <div className='w-full h-full'>
      <div ref={viewRef} className='w-full h-full flex flex-col md:flex-row'>
        <div className='flex-1 w-full md:w-1/2 h-1/2 md:h-full'>
          <TransformWrapper centerZoomedOut centerOnInit initialScale={1}>
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              {!!imageURL && (
                <div className='h-[50vh] md:h-screen w-screen md:w-[calc(100vw-480px)]'>
                  <LoadableImage
                    className='object-contain w-full h-full'
                    src={imageURL}
                    alt={detail?.workflow?.name || 'Attachment'}
                  />
                </div>
              )}
            </TransformComponent>
          </TransformWrapper>
        </div>
        <div className='w-full md:w-1/2 lg:w-[480px] h-1/2 md:h-full'>
          <div className='w-full h-full overflow-x-hidden overflow-y-auto py-3 md:px-3 pr-0 shadow-inner'>
            <h1 className='text-xl font-bold uppercase px-1'>{detail?.workflow?.name}</h1>
            <h1 className='text-sm uppercase px-1'>{detail?.workflow?.description}</h1>

            {/* Tags Section */}
            <div className='mt-4 px-1'>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>
                  <code className='font-bold'>{t('tags')}</code>
                </div>
              </div>

              <div className='relative z-50' onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
                <MultiSelect
                  options={
                    allTags?.map((tag) => ({
                      label: tag.info.name,
                      value: tag.info.id,
                      icon: Tag
                    })) ?? []
                  }
                  placeholder={t('tags')}
                  defaultValue={crrTags}
                  onValueChange={(tags) => {
                    if (attachment?.id) {
                      tagMutFn.mutate({
                        attachmentId: attachment.id,
                        tags
                      })
                    }
                  }}
                  onCreateNew={(tag) => createTag.mutate(tag)}
                  variant='inverted'
                  maxCount={5}
                />
              </div>
            </div>

            <code className='whitespace-pre-wrap flex flex-col gap-2 mt-4'>
              {Object.entries(configMap)
                .filter(([key]) => configMap[key].type !== EValueUtilityType.Prefixer)
                .map(([key, value], idx) => {
                  return (
                    <div
                      key={key}
                      className={cn('w-full p-1', {
                        'bg-secondary': idx % 2 === 0
                      })}
                    >
                      {renderMapperInput(value, config[key] || value.default)}
                    </div>
                  )
                })}
            </code>
            <div className='mt-4 flex gap-2 pb-4 px-1'>
              <Button onClick={onPressDownloadHigh} className='rounded-full'>
                <Download width={16} height={16} className='mr-2' /> Compressed JPG
              </Button>
              <Button onClick={onPressDownloadRaw} className='rounded-full' variant='secondary'>
                <Download width={16} height={16} className='mr-2' /> Raw image
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
