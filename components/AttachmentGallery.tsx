'use client'

import { ImageGallery } from '@/components/ImageGallery'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EUserRole } from '@/entities/enum'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { trpc } from '@/utils/trpc'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'

const PASSIVE_WATCH_PENDING_INTERVAL = 3000

export const AttachmentGallery: IComponent<{
  slug?: string
}> = ({ slug }) => {
  const { router } = useCurrentRoute()
  const { data: session } = useSession()
  const taskInfo = trpc.workflow.get.useQuery(slug!, { enabled: !!slug })
  const infoLoader = trpc.workflow.attachments.useInfiniteQuery(
    {
      workflowId: slug,
      limit: 20
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      trpc: {
        context: {
          skipBatch: true
        }
      }
    }
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const dyn = useDynamicValue([720, 1200, 1800], undefined, containerRef)

  const avatarSetter = trpc.workflow.setAvatar.useMutation()

  const workflowListLoader = trpc.workflow.listWorkflowSelections.useQuery()
  const handlePickWorkflow = (id: string) => {
    router.push(`/main/workflow/${id}`)
  }

  const runningTask = trpc.workflowTask.getRunning.useQuery({
    workflowId: slug
  })

  trpc.watch.workflow.useSubscription(slug!, {
    onData: () => {
      infoLoader.refetch()
      runningTask.refetch()
    },
    enabled: !!slug
  })

  trpc.watch.historyList.useSubscription(undefined, {
    onData: () => {
      infoLoader.refetch()
      runningTask.refetch()
    },
    enabled: !slug
  })

  const pending = useMemo(() => {
    return runningTask.data ? runningTask.data.map((d) => ({ ...d, loading: true }) as const) : []
  }, [runningTask.data])
  const images = infoLoader.data ? infoLoader.data.pages.flatMap((d) => d.items) : []
  const allowFav = !!session?.user.role && session.user.role > EUserRole.User && !!slug

  useEffect(() => {
    if (!!slug) return
    let interval: Timer
    if (pending.length > 0) {
      interval = setInterval(() => {
        infoLoader.refetch()
        runningTask.refetch()
      }, PASSIVE_WATCH_PENDING_INTERVAL)
    }
    return () => clearInterval(interval)
  }, [infoLoader, pending, runningTask, slug])

  const handlePressFavorite = async (imageId: string) => {
    if (!!slug) {
      await avatarSetter.mutateAsync({
        workflowId: slug!,
        attachmentId: imageId
      })
      await taskInfo.refetch()
    }
  }

  const t = useTranslations('components.gallery')

  return (
    <div ref={containerRef} className='absolute top-0 left-0 w-full h-full flex flex-col shadow-inner'>
      {!!slug && (
        <div className='p-2 w-full md:hidden'>
          <Select defaultValue={slug} onValueChange={handlePickWorkflow}>
            <SelectTrigger>
              <SelectValue placeholder={t('select')} className='w-full' />
            </SelectTrigger>
            <SelectContent>
              {workflowListLoader.data?.map((selection) => (
                <SelectItem key={selection.id} value={selection.id} className='flex flex-col w-full items-start'>
                  <div className='md:w-[300px] font-semibold whitespace-normal break-words text-left'>
                    {selection.name}
                  </div>
                  <p className='text-xs'>{selection.description}</p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <ImageGallery
        imgPerRow={dyn([2, 3, 4, 5])}
        items={[...pending, ...images]}
        favoriteIds={[taskInfo.data?.avatar?.id ?? '']}
        onPressFavorite={allowFav ? handlePressFavorite : undefined}
        hasNextPage={infoLoader.hasNextPage}
        isFetchingNextPage={infoLoader.isFetchingNextPage}
        onFetchMore={infoLoader.fetchNextPage}
        renderEmpty={() => {
          return (
            <div className='flex flex-col text-center text-foreground/50'>
              <ExclamationTriangleIcon className='w-6 h-6 mx-auto my-2' />
              <span className='uppercase'>{t('isEmpty.title')}</span>
              <p className='text-xs'>{t('isEmpty.description')}</p>
            </div>
          )
        }}
      />
    </div>
  )
}
