'use client'

import { RouteConf } from '@/constants/route'
import { EDeviceStatus } from '@/entities/enum'
import useMobile from '@/hooks/useMobile'
import { cn } from '@/utils/style'
import { trpc } from '@/utils/trpc'
import { Link, redirect } from '@routing'
import { LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useLocale } from 'next-intl'
import { useMemo } from 'react'

export default function SettingPage() {
  const isMobile = useMobile(null)
  const session = useSession()
  const locale = useLocale()

  const updateStatus = trpc.userClient.updateStatus.useMutation()

  const handlePressLogout = async () => {
    try {
      await updateStatus.mutateAsync({ status: EDeviceStatus.OFFLINE })
    } catch (e) {
      console.error(e)
    }
    signOut({
      callbackUrl: '/',
      redirect: true
    })
  }

  const renderItems = useMemo(() => {
    const settings = Object.values(RouteConf).filter(
      (v) => v.path.includes('/main/setting/') && v.minPerm <= session.data!.user!.role
    )
    return settings.map((setting, idx) => {
      const Icon = setting.SubIcon
      return (
        <Link
          href={setting.path}
          key={setting.key}
          className={cn('w-full px-3 py-4 flex flex-row gap-2 items-center btn odd:bg-secondary')}
        >
          <Icon className='w-6 h-6' />
          <span className='uppercase text-xs font-bold'>{setting.title.split(' ')[1]}</span>
        </Link>
      )
    })
  }, [session.data])

  if (isMobile === null) return null

  if (!isMobile) {
    redirect({
      href: { pathname: '/main/setting/account' },
      locale
    })
    return null
  }

  return (
    <div className='flex flex-col'>
      {renderItems}
      <button
        onClick={handlePressLogout}
        className={cn('w-full px-3 py-4 flex flex-row gap-2 items-center btn odd:bg-secondary')}
      >
        <LogOut className='w-6 h-6' />
        <span className='uppercase text-xs font-bold'>Logout</span>
      </button>
    </div>
  )
}
