import React from 'react'
import { useTranslations } from 'next-intl'

import useFileBundler from '@/hooks/useImageBundler'
import { cn } from '@/utils/style'
import AnimatedCircularProgressBar from '../ui/animated-circular-progress-bar'
import { Button } from '../ui/button'
import { Download } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { trpc } from '@/utils/trpc'
import { EValueType } from '@/entities/enum'

const DownloadImagesButton: IComponent<{
  workflowTaskId?: string
  className?: string
}> = ({ workflowTaskId, className }) => {
  const t = useTranslations('components.downloadButton')
  const { data: attachments, refetch: refetchAttachments } = trpc.workflowTask.getOutputAttachmentUrls.useQuery(
    workflowTaskId!,
    {
      enabled: !!workflowTaskId,
      refetchOnWindowFocus: false
    }
  )
  const haveVideo = !!attachments?.some((a) => a?.type === EValueType.Video)
  const haveImage = !!attachments?.some((a) => a?.type === EValueType.Image)

  const { bundleFiles, isLoading, progress, error } = useFileBundler()

  const downloadRawOutput = () => {
    if (isLoading) return
    try {
      const images = attachments
        ?.filter((a) => !!a)
        .filter((a) => !!a.raw?.url)
        .map((v) => v.raw!.url) as string[]
      bundleFiles(images)
    } catch (e) {
      console.error(e)
    }
  }

  const downloadCompressedJpg = () => {
    if (isLoading) return
    try {
      const images = attachments
        ?.filter((a) => !!a && a.type === EValueType.Image)
        .filter((a) => !!a.high?.url)
        .map((v) => v.high!.url) as string[]
      bundleFiles(images)
    } catch (e) {
      console.error(e)
    }
  }

  const downloadVideos = () => {
    if (isLoading) return
    try {
      const videos = attachments
        ?.filter((a) => !!a && a.type === EValueType.Video)
        .filter((a) => !!a.raw?.url)
        .map((v) => v.raw!.url) as string[]
      bundleFiles(videos)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className='flex items-center'>
        <Button size='icon' variant='ghost' className={className}>
          {isLoading ? (
            <div className='w-full overflow-hidden'>
              <AnimatedCircularProgressBar
                max={100}
                min={0}
                className={cn('w-full h-full text-xs')}
                value={progress}
                gaugePrimaryColor='rgb(255 255 255)'
                gaugeSecondaryColor='rgba(0, 0, 0, 0.1)'
              />
            </div>
          ) : (
            <Download width={16} height={16} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side='left' align='center'>
        {haveVideo && (
          <DropdownMenuItem onClick={downloadVideos} className='cursor-pointer text-sm'>
            <span>{t('downloadVideo')}</span>
          </DropdownMenuItem>
        )}
        {haveImage && (
          <DropdownMenuItem onClick={downloadCompressedJpg} className='cursor-pointer text-sm'>
            <span>{t('downloadJpg')}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={downloadRawOutput} className='cursor-pointer text-sm'>
          <span>{t('downloadRaw')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DownloadImagesButton
