'use client'

import { useConnectionStore } from '@/states/connection'
import { setAuthToken, trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'

import type React from 'react'

import { useEffect, type PropsWithChildren } from 'react'

const TRPCLayout: React.FC<PropsWithChildren> = ({ children }) => {
  const { data: session } = useSession()
  const { setWsConnected } = useConnectionStore()

  useEffect(() => {
    setAuthToken(session?.accessToken.token ?? '', session?.accessToken.wsToken ?? '')
      .then((connected) => {
        setWsConnected(connected)
      })
      .catch(() => {
        alert('Websocket connection failed, please check your configuration')
      })
  }, [session, setWsConnected])

  return <>{children}</>
}

export default trpc.withTRPC(TRPCLayout) as typeof TRPCLayout
