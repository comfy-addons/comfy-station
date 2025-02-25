'use client'

import { ImageGallery } from '@/components/ImageGallery'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { EUserRole } from '@/entities/enum'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { trpc } from '@/utils/trpc'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useStorageState } from '@/hooks/useStorageState'
import { GalleryFilterBar, GalleryFilters } from './GalleryFilterBar'

const PASSIVE_WATCH_PENDING_INTERVAL = 3000

export const AttachmentGallery: IComponent<{
  slug?: string
}> = ({ slug }) => {
  const { router } = useCurrentRoute()
  const { data: session } = useSession()
  const taskInfo = trpc.workflow.get.useQuery(slug!, { enabled: !!slug })

  // Add filter state with storage persistence
  const [filters, setFilters] = useStorageState<GalleryFilters>('gallery-filters', {
    onlyFavorites: false,
    selectedTags: []
  })

  // Get available tags for filtering
  const { data: tagsList } = trpc.attachmentTag.list.useQuery()

  // Update query with filters
  const infoLoader = trpc.workflow.attachments.useInfiniteQuery(
    {
      workflowId: slug,
      limit: 20,
      onlyLiked: filters.onlyFavorites,
      tags: filters.selectedTags.length > 0 ? filters.selectedTags : undefined
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

  // Handle filter changes
  const handleFilterChange = (newFilters: GalleryFilters) => {
    setFilters(newFilters)
    // Reset infoLoader query data when filters change
    infoLoader.refetch()
  }

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

  const handlePressSetAvatar = async (imageId: string) => {
    if (!!slug) {
      await avatarSetter.mutateAsync({
        workflowId: slug!,
        attachmentId: imageId
      })
      await taskInfo.refetch()
    }
  }

  const t = useTranslations('components.gallery')
  const [manualImgPerRow, setManualImgPerRow] = useStorageState<number | null>('gallery-item', null)

  const effectiveImgPerRow = manualImgPerRow ?? dyn([2, 3, 4, 5])

  // Calculate total items for display
  const totalItems = infoLoader.data?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0

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

      {/* Add filter bar */}
      <div className='px-3 pt-2 absolute w-full z-[999] bg-background/90 backdrop-blur'>
        <GalleryFilterBar
          filters={filters}
          onChange={handleFilterChange}
          availableTags={tagsList?.map((t) => t.info) || []}
          totalItems={totalItems}
        />
      </div>

      <ImageGallery
        className='md:pt-14'
        imgPerRow={effectiveImgPerRow}
        items={[...pending, ...images]}
        favoriteIds={[taskInfo.data?.avatar?.id ?? '']}
        onPressSetAvatar={allowFav ? handlePressSetAvatar : undefined}
        hasNextPage={infoLoader.hasNextPage}
        isFetchingNextPage={infoLoader.isFetchingNextPage}
        onFetchMore={infoLoader.fetchNextPage}
        renderEmpty={() => {
          return (
            <div className='flex flex-col text-center text-foreground/50'>
              <ExclamationTriangleIcon className='w-6 h-6 mx-auto my-2' />
              <span className='uppercase'>
                {filters.onlyFavorites || filters.selectedTags.length > 0
                  ? t('isEmpty.filteredTitle')
                  : t('isEmpty.title')}
              </span>
              <p className='text-xs'>
                {filters.onlyFavorites || filters.selectedTags.length > 0
                  ? t('isEmpty.filteredDescription')
                  : t('isEmpty.description')}
              </p>
            </div>
          )
        }}
      />
      <div className='absolute bottom-4 right-4 z-10 group hidden md:block'>
        <div className='flex items-center gap-4'>
          <div className='bg-background/80 backdrop-blur-sm shadow-lg border rounded-full h-10 w-10 flex items-center justify-center overflow-hidden group-hover:w-[200px] transition-all duration-200 ease-out'>
            <div className='flex items-center gap-2 w-full'>
              <code className='flex-none w-6 px-2 group-hover:px-4 text-center font-medium m-auto'>
                {manualImgPerRow ?? effectiveImgPerRow}
              </code>
              <div className='flex-grow hidden group-hover:flex transition-opacity duration-200 items-center gap-2'>
                <Slider
                  className='w-[100px]'
                  min={1}
                  max={6}
                  step={1}
                  value={[manualImgPerRow ?? effectiveImgPerRow]}
                  onValueChange={([value]) => setManualImgPerRow(value)}
                />
                <button
                  disabled={manualImgPerRow === null}
                  onClick={() => setManualImgPerRow(null)}
                  className='text-xs text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:text-foreground transition-colors'
                >
                  {t('resetGrid')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
