'use client'

import { ImageGallery } from '@/components/ImageGallery'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { trpc } from '@/utils/trpc'

export default function WorkflowGallery() {
  const { slug, router } = useCurrentRoute()
  const taskInfo = trpc.workflow.get.useQuery(slug!, { enabled: !!slug })
  const infoLoader = trpc.workflow.attachments.useInfiniteQuery(
    {
      workflowId: slug!,
      limit: 20
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor, enabled: !!slug }
  )
  const dyn = useDynamicValue()

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

  const pending = runningTask.data ? runningTask.data.map(() => ({ loading: true }) as const) : []
  const images = infoLoader.data ? infoLoader.data.pages.flatMap((d) => d.items) : []

  const handlePressFavorite = async (imageId: string) => {
    await avatarSetter.mutateAsync({
      workflowId: slug!,
      attachmentId: imageId
    })
    await taskInfo.refetch()
  }

  return (
    <div className='absolute top-0 left-0 w-full h-full flex-1 flex-wrap gap-2 shadow-inner'>
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
        imgPerRow={dyn([2, 2, 3])}
        rows={[...pending, ...images]}
        favoriteIds={[taskInfo.data?.avatar?.id ?? '']}
        onPressFavorite={handlePressFavorite}
        hasNextPage={infoLoader.hasNextPage}
        isFetchingNextPage={infoLoader.isFetchingNextPage}
        onFetchMore={infoLoader.fetchNextPage}
      />
    </div>
  )
}
