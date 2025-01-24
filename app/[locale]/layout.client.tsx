'use client'

import dynamic from 'next/dynamic'
import { LoadingSVG } from '@/components/svg/LoadingSVG'
import { Card } from '@/components/ui/card'
import { Toaster } from '@/components/ui/toaster'
import useDarkMode from '@/hooks/useDarkmode'
import { useRouter } from '@routing'
import { ReactFlowProvider } from '@xyflow/react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { PhotoProvider } from 'react-photo-view'
import { IdleTimerProvider } from 'react-idle-timer'

import 'react-photo-view/dist/react-photo-view.css'
import { trpc } from '@/utils/trpc'
import { EDeviceStatus } from '@/entities/enum'
import { useActionDebounce } from '@/hooks/useAction'
import { useConnectionStore } from '@/states/connection'

export const ClientLayout: IComponent = ({ children }) => {
  const pathname = usePathname()
  const session = useSession()
  const router = useRouter()
  const isDarkMode = useDarkMode()
  const { wsConnected } = useConnectionStore()
  const debounce = useActionDebounce(500, true)
  const keepAlive = trpc.userClient.ping.useMutation()
  const userStatusUpdater = trpc.userClient.updateStatus.useMutation()

  const isMain = pathname.includes('/main')

  const isLoading = session.status === 'loading' || (isMain && !wsConnected)

  const updateStatus = useCallback(
    (status: EDeviceStatus) => {
      debounce(() => {
        userStatusUpdater.mutate({ status })
      })
    },
    [debounce, userStatusUpdater]
  )

  useEffect(() => {
    const root = document.getElementsByTagName('html')?.[0]
    if (root) {
      if (isDarkMode) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [isDarkMode])

  useEffect(() => {
    if (session.status === 'authenticated' && !isMain) {
      router.replace('/main')
    }
    if (session.status === 'unauthenticated' && !pathname.includes('/auth')) {
      router.replace('/auth/basic')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isMain])

  useEffect(() => {
    // Update status to online when component is mounted
    updateStatus(EDeviceStatus.ONLINE)
    // Prevent zoom-to-tabs gesture in safari
    document.addEventListener('gesturestart', function (e) {
      e.preventDefault()
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = '0.99'
    })

    document.addEventListener('gesturechange', function (e) {
      e.preventDefault()
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = '0.99'
    })

    document.addEventListener('gestureend', function (e) {
      e.preventDefault()
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = '0.99'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const vsFn = () => {
      if (document.hidden) {
        updateStatus(EDeviceStatus.IDLE)
      } else {
        updateStatus(EDeviceStatus.ONLINE)
      }
    }
    const beforeUnloadFn = () => {
      userStatusUpdater.mutate({ status: EDeviceStatus.OFFLINE })
    }
    // Listen if this tab is not active
    document.addEventListener('visibilitychange', vsFn)
    // Listen if this tab is closed
    window.addEventListener('beforeunload', beforeUnloadFn)

    return () => {
      document.removeEventListener('visibilitychange', vsFn)
      window.removeEventListener('beforeunload', beforeUnloadFn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      keepAlive.mutate()
    }, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [keepAlive])

  return (
    <IdleTimerProvider
      startOnMount
      timeout={60000}
      onIdle={() => updateStatus(EDeviceStatus.IDLE)}
      onActive={() => updateStatus(EDeviceStatus.ONLINE)}
    >
      {isLoading && (
        <div className='top-0 left-0 fixed w-screen h-[100dvh] md:h-screen z-10 bg-popover/50 flex justify-end items-end p-8'>
          <Card className='p-4 flex gap-4 items-center bg-background'>
            <LoadingSVG width={32} height={32} />
          </Card>
        </div>
      )}
      <ReactFlowProvider>
        <PhotoProvider
          loadingElement={
            <div className='flex justify-center items-center h-full w-full'>
              <LoadingSVG width={32} height={32} />
            </div>
          }
        >
          {((wsConnected && isMain) || (!wsConnected && !isMain)) && children}
        </PhotoProvider>
      </ReactFlowProvider>
      <Toaster />
    </IdleTimerProvider>
  )
}
