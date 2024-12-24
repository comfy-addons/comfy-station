'use client'

import { ImageGallery } from '@/components/ImageGallery'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EUserRole } from '@/entities/enum'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { trpc } from '@/utils/trpc'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'

export default function WorkflowGallery() {
  const { slug, router } = useCurrentRoute()
  const { data: session } = useSession()
  const taskInfo = trpc.workflow.get.useQuery(slug!, { enabled: !!slug })
  const infoLoader = trpc.workflow.attachments.useInfiniteQuery(
    {
      workflowId: slug!,
      limit: 20
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor, enabled: !!slug }
  )
  const dyn = useDynamicValue([1200, 1800, 2400])

  const avatarSetter = trpc.workflow.setAvatar.useMutation()

  const workflowListLoader = trpc.workflow.listWorkflowSelections.useQuery()
  const handlePickWorkflow = (id: string) => {
    router.push(`/main/workflow/${id}`)
  }

  const runningTask = trpc.workflowTask.getRunning.useQuery(
    {
      workflowId: slug!
    },
    {
      enabled: !!slug
    }
  )

  trpc.watch.workflow.useSubscription(slug!, {
    onData: () => {
      infoLoader.refetch()
      runningTask.refetch()
    },
    enabled: !!slug
  })

  const pending = runningTask.data ? runningTask.data.map((d) => ({ ...d, loading: true }) as const) : []
  const images = infoLoader.data ? infoLoader.data.pages.flatMap((d) => d.items) : []
  const allowFav = !!session?.user.role && session.user.role > EUserRole.User

  const handlePressFavorite = async (imageId: string) => {
    await avatarSetter.mutateAsync({
      workflowId: slug!,
      attachmentId: imageId
    })
    await taskInfo.refetch()
  }

  return (
    <div className='absolute top-0 left-0 w-full h-full flex flex-col shadow-inner'>
      <div className='p-2 w-full md:hidden'>
        <Select defaultValue={slug} onValueChange={handlePickWorkflow}>
          <SelectTrigger>
            <SelectValue placeholder='Select...' className='w-full' />
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
              <span className='uppercase'>Gallery is empty</span>
              <p className='text-xs'>Create your first task to see the results</p>
            </div>
          )
        }}
      />
    </div>
  )
}
