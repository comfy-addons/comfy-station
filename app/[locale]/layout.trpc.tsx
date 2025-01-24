'use client'

import { setAuthToken, trpc } from '@/utils/trpc'
import { useSession } from 'next-auth/react'

import type React from 'react'

import { useEffect, type PropsWithChildren } from 'react'

const TRPCLayout: React.FC<PropsWithChildren> = ({ children }) => {
  const { data: session } = useSession()

  useEffect(() => {
    setAuthToken(session?.accessToken.token ?? '', session?.accessToken.wsToken ?? '')
  }, [session])

  return <>{children}</>
}

export default trpc.withTRPC(TRPCLayout) as typeof TRPCLayout
