import { trpc } from '@/utils/trpc'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { BellIcon, Check, ListChecks, Trash2 } from 'lucide-react'
import { cn } from '@/utils/style'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import type { UserNotification } from '@/entities/user_notifications'
import { ENotificationTarget } from '@/entities/enum'
import LoadableImage from './LoadableImage'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { LoadingSVG } from './svg/LoadingSVG'
import DownloadImagesButton from './ui-ext/download-button'

TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

const dotLoading = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

const canShowNotifications = () => {
  return 'Notification' in window && Notification.permission === 'granted'
}

const NotificationItem = ({ notification, onClick }: { notification: UserNotification; onClick: () => void }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const markRead = trpc.notification.markAsRead.useMutation()

  const { data: taskInfo } = trpc.workflowTask.get.useQuery(String(notification.target!.targetId), {
    enabled: !!notification.target && notification.target.targetType === ENotificationTarget.WorkflowTask
  })

  const { data: attachments } = trpc.workflowTask.getOutputAttachmentUrls.useQuery(
    String(notification.target!.targetId),
    {
      enabled: !!notification.target && notification.target.targetType === ENotificationTarget.WorkflowTask
    }
  )

  useEffect(() => {
    if (attachments?.[0]?.preview) {
      setPreviewUrl(attachments[0].preview.url)
    }
  }, [attachments])

  const isSubTask = taskInfo?.parent !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      onMouseEnter={() => !notification.read && markRead.mutate({ id: notification.id })}
      className={cn('p-4 border-b flex items-center gap-2 group hover:bg-muted/50', {
        'bg-secondary': !notification.read
      })}
    >
      {!!previewUrl && (
        <LoadableImage alt='Preview image' src={previewUrl} containerClassName='w-16 h-16 rounded overflow-hidden' />
      )}
      <div className='flex-1'>
        <p className='text-sm'>{notification.title}</p>
        {!!notification.description && <p className='text-xs text-muted-foreground'>{notification.description}</p>}
        {!!notification.target?.targetId && !isSubTask && (
          <span className='text-xs'>ID: #{notification.target.targetId.toString().split('-').at(-1)}</span>
        )}
        {!!notification.target?.targetId && !!taskInfo?.parent && isSubTask && (
          <span className='text-xs'>ID: #{taskInfo!.parent!.toString().split('-').at(-1)}</span>
        )}
        <p className='text-xs text-muted-foreground'>{timeAgo.format(new Date(notification.createdAt))}</p>
      </div>
      {!!notification.target && notification.target.targetType === ENotificationTarget.WorkflowTask && (
        <DownloadImagesButton workflowTaskId={String(notification.target!.targetId)} />
      )}
    </motion.div>
  )
}

export const UserNotificationCenter: IComponent<{
  isAdmin: boolean
}> = ({ isAdmin }) => {
  const dotIdx = useRef(0)
  const [isRunning, setIsRunning] = useState(false)
  const {
    data: notifications,
    refetch,
    fetchNextPage,
    hasNextPage
  } = trpc.notification.list.useInfiniteQuery(
    {
      limit: 10
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor
    }
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanNotification = trpc.notification.markAsReadAll.useMutation()

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission()
    }
  }, [])

  trpc.watch.notification.useSubscription(undefined, {
    onData: async (data) => {
      refetch()
    }
  })

  trpc.watch.executing.useSubscription(undefined, {
    onData: (running) => setIsRunning(running)
  })

  trpc.notification.watch.useSubscription(undefined, {
    onData: (data) => {
      if (document.hidden && canShowNotifications()) {
        new Notification(data.title, {
          body: data.description,
          icon: '/favicon.ico'
        })
      }
    }
  })

  const markRead = trpc.notification.markAsRead.useMutation()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage) {
        fetchNextPage()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [fetchNextPage, hasNextPage])

  const items = notifications?.pages.map((p) => p.items).flat()

  const haveNoti = !!items?.some((v) => !v.read)

  useEffect(() => {
    if (isRunning) {
      const bak = document.title
      const interval = setInterval(() => {
        dotIdx.current = (dotIdx.current + 1) % dotLoading.length
        document.title = `${dotLoading[dotIdx.current]} | ${bak}`
      }, 1000)
      return () => {
        clearInterval(interval)
        document.title = bak
      }
    }
  }, [isRunning])

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <div
          className={cn('ml-auto relative flex items-center justify-center', {
            'order-0': !isAdmin,
            'order-2': isAdmin
          })}
        >
          <Button size='icon' variant='secondary' className={cn('rounded-full')}>
            <BellIcon className='rounded-full' width={16} height={16} />
          </Button>
          {haveNoti && <span className='absolute -top-0.5 -right-0.5 w-3 z-10 h-3 bg-red-500 shadow rounded-full' />}
          {isRunning && <LoadingSVG width={36} height={36} className='absolute -z-0 opacity-30 pointer-events-none' />}
        </div>
      </PopoverTrigger>
      <PopoverContent className='min-w-96 p-0'>
        <div className='w-full h-[400px] flex flex-col'>
          <div className='px-4 py-2 border-b flex items-center justify-between'>
            <code className='font-bold text-sm'>NOTIFICATION CENTER</code>
            <Button size='icon' variant='ghost' title='Mark all as read' onClick={() => cleanNotification.mutate()}>
              <ListChecks className='w-4 h-4' />
            </Button>
          </div>
          <div className='flex-1 overflow-auto' ref={containerRef}>
            <AnimatePresence mode='popLayout'>
              {items?.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  onClick={() => markRead.mutate({ id: notification.id })}
                  notification={notification}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
