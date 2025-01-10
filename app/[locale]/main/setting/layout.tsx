'use client'

import { RouteConf } from '@/constants/route'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { cn } from '@/lib/utils'
import { Link } from '@routing'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

const Layout: IComponent = ({ children }) => {
  const session = useSession()
  const { routeConf } = useCurrentRoute()

  const renderTabs = useMemo(() => {
    const settings = Object.values(RouteConf).filter(
      (v) => v.path.includes('/main/setting/') && v.minPerm <= session.data!.user!.role
    )
    return settings.map((setting) => {
      const Icon = setting.SubIcon
      return (
        <Link
          href={setting.path}
          key={setting.key}
          className={cn('w-full px-3 py-4 flex flex-col gap-2 items-center btn', {
            'bg-foreground text-background': routeConf?.key === setting.key
          })}
        >
          <Icon className='w-6 h-6' />
          <span className='uppercase text-xs font-bold'>{setting.title.split(' ')[1]}</span>
        </Link>
      )
    })
  }, [routeConf?.key, session.data])

  return (
    <div className='w-full h-full flex flex-row divide-x-[1px]'>
      <div className='h-full flex flex-col divide-y-[1px]'>{renderTabs}</div>
      <div className='flex-1 h-full hidden md:grid'>{children}</div>
    </div>
  )
}

export default Layout
