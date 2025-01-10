'use client'

import { ImageGallery } from '@/components/ImageGallery'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { trpc } from '@/utils/trpc'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ImageOff } from 'lucide-react'
import { useEffect } from 'react'

export default function GalleryPage() {
  const infoLoader = trpc.workflow.attachments.useInfiniteQuery(
    {
      limit: 20
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  )
  const dyn = useDynamicValue([720, 1200, 1800])

  const runningTask = trpc.workflowTask.getRunning.useQuery({})

  useEffect(() => {
    // Refetch every 5s
    const interval = setInterval(() => {
      infoLoader.refetch()
      runningTask.refetch()
    }, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoLoader.refetch, runningTask.refetch])

  const pending = runningTask.data ? runningTask.data.map((d) => ({ ...d, loading: true }) as const) : []
  const images = infoLoader.data ? infoLoader.data.pages.flatMap((d) => d.items) : []

  return (
    <div className='absolute top-0 left-0 w-full h-full flex flex-col'>
      <ImageGallery
        imgPerRow={dyn([2, 3, 4, 5])}
        items={[...pending, ...images]}
        hasNextPage={infoLoader.hasNextPage}
        isFetchingNextPage={infoLoader.isFetchingNextPage}
        onFetchMore={infoLoader.fetchNextPage}
        renderEmpty={() => {
          return (
            <div className='flex flex-col text-center text-foreground/50'>
              <ImageOff className='w-6 h-6 mx-auto my-2' />
              <span className='uppercase'>Gallery is empty</span>
              <p className='text-xs'>Create your first task to see the results</p>
            </div>
          )
        }}
      />
    </div>
  )
}
