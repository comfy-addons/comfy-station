import { Attachment } from '@/entities/attachment'
import LoadableImage, { LoadableImageProps } from './LoadableImage'
import { trpc } from '@/utils/trpc'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

interface IAttachmentImage extends LoadableImageProps {
  data?: Attachment | { id?: string }
  zoomable?: boolean
  zoomableProps?: {
    wrapperClass: string
  }
  preferredSize?: 'preview' | 'high' | 'raw'
}

export const AttachmentImage: IComponent<IAttachmentImage> = ({
  data,
  preferredSize = 'preview',
  zoomable,
  zoomableProps,
  ...props
}) => {
  const { data: image, isLoading } = trpc.attachment.get.useQuery(
    {
      id: data?.id!
    },
    {
      enabled: !!data?.id,
      staleTime: Infinity
    }
  )

  const src = image?.[preferredSize || 'preview']?.url || image?.high?.url || image?.raw?.url

  if (zoomable) {
    return (
      <TransformWrapper centerZoomedOut centerOnInit>
        <TransformComponent wrapperClass={zoomableProps?.wrapperClass}>
          <LoadableImage {...props} src={src} loading={props.loading || isLoading} />
        </TransformComponent>
      </TransformWrapper>
    )
  }

  return <LoadableImage {...props} src={src} loading={props.loading || isLoading} />
}
