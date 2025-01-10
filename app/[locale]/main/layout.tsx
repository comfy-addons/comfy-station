'use client'

import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSession } from 'next-auth/react'
import { AdminSideInfo } from './AdminSideInfo'
import { TopBar } from './TopBar'
import { EUserRole } from '@/entities/enum'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { WorkflowSidePicker } from './WorkflowSidePicker'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartBarIcon, ListIcon, PlaySquare } from 'lucide-react'
import { forceRecalculatePortal, Portal } from '@/components/Portal'
import { RouteConf } from '@/constants/route'
import { TooltipPopupContainer } from '@/components/TooltipPopup'

const Layout: IComponent = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const session = useSession()
  const { routeConf, router } = useCurrentRoute()
  const dyn = useDynamicValue()
  const [executeTab, setExecuteTab] = useState('visualize')

  const isAdmin = session.data?.user?.role === EUserRole.Admin
  const isExecutePage = routeConf?.key === 'execute'

  useEffect(() => {
    setTimeout(() => forceRecalculatePortal(), 200)
  }, [routeConf])

  const renderDesktopView = useMemo(() => {
    return (
      <Tabs
        value={routeConf?.group}
        onValueChange={(value) => {
          const conf = Object.values(RouteConf).find((v) => v.group === value)
          if (conf) router.push(conf.path)
        }}
        className='w-full h-full flex flex-col md:flex-row space-x-2 overflow-hidden'
      >
        {isExecutePage && (
          <div className='w-full md:w-1/4 min-w-[290px] md:max-w-[360px] min-h-full bg-background border rounded-lg'>
            <WorkflowSidePicker />
          </div>
        )}
        <div
          ref={ref}
          id='main-content'
          className='flex-1 hidden md:flex flex-col h-full overflow-hidden bg-background border rounded-lg transition-all duration-300 relative'
        >
          <TopBar />
          <SimpleTransitionLayout deps={[routeConf?.group || '']} className='flex-1 relative border-t'>
            {children}
          </SimpleTransitionLayout>
          {!isExecutePage && (
            <Portal target={ref}>
              <div
                className='absolute hidden md:block left-[50%] bottom-4 md:-bottom-4 z-10 shadow p-1 backdrop-blur-lg bg-background/40 rounded-lg duration-200'
                style={{
                  transform: 'translateX(-50%)'
                }}
              >
                <TabsList>
                  <TabsTrigger value='Workflows'>Workflows</TabsTrigger>
                  <TabsTrigger value='Gallery'>Gallery</TabsTrigger>
                  <TabsTrigger value='Setting'>Setting</TabsTrigger>
                </TabsList>
              </div>
            </Portal>
          )}
        </div>
        {isAdmin && (
          <div className='w-1/4 max-w-[360px] min-w-max h-full bg-background border rounded-lg'>
            <AdminSideInfo />
          </div>
        )}
      </Tabs>
    )
  }, [children, isAdmin, isExecutePage, routeConf?.group, router])

  const renderMobileView = useMemo(() => {
    return (
      <div className='fixed top-0 bottom-0 w-full h-full flex flex-col md:flex-row overflow-hidden'>
        <Tabs
          value={executeTab}
          onValueChange={(v) => setExecuteTab(v)}
          className='w-full h-full flex flex-col relative'
        >
          {isExecutePage && (
            <TabsList className='bg-background z-10 h-fit w-full rounded-none border-b'>
              <TabsTrigger value='history' className='py-2 data-[state=active]:shadow-none'>
                <div className='flex gap-2 items-center'>
                  <PlaySquare width={16} height={16} /> Execute
                </div>
              </TabsTrigger>
              <TabsTrigger value='visualize' className='py-2 data-[state=active]:shadow-none'>
                <div className='flex gap-2 items-center'>
                  <ListIcon width={16} height={16} /> {isExecutePage ? 'Tasks' : 'Workflows'}
                </div>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value='admin-pannel' className='py-2 data-[state=active]:shadow-none'>
                  <div className='flex gap-2 items-center'>
                    <ChartBarIcon width={16} height={16} /> Admin
                  </div>
                </TabsTrigger>
              )}
            </TabsList>
          )}
          <TabsContent value='history' className='w-full flex-1 bg-background rounded-lg mt-0'>
            <WorkflowSidePicker />
          </TabsContent>
          <TabsContent value='visualize' className='w-full flex-1 bg-background rounded-lg mt-0 relative'>
            <div
              id='main-content'
              className='flex flex-col h-full overflow-hidden bg-background md:border md:rounded-lg transition-all duration-300 relative'
            >
              {!isExecutePage && <TopBar />}
              <SimpleTransitionLayout deps={[routeConf?.key || '']} className='flex-1 relative'>
                {children}
              </SimpleTransitionLayout>
            </div>
          </TabsContent>
          <TabsContent value='gallery' className='w-full flex-1 bg-background rounded-lg mt-0 relative'>
            <div
              id='main-content'
              className='flex flex-col h-full overflow-hidden bg-background md:border md:rounded-lg transition-all duration-300 relative'
            >
              <SimpleTransitionLayout deps={[routeConf?.key || '']} className='flex-1 relative'>
                {children}
              </SimpleTransitionLayout>
            </div>
          </TabsContent>
          {isAdmin && (
            <TabsContent value='admin-pannel' className='w-full flex-1 bg-background px-1 rounded-lg mt-0 pt-2'>
              <AdminSideInfo />
            </TabsContent>
          )}
        </Tabs>
        <Tabs
          defaultValue='home'
          value={routeConf?.key}
          onValueChange={() => {
            setExecuteTab('visualize')
          }}
          className='w-full flex flex-col relative'
        >
          <TabsList className='bg-background z-10 h-fit w-full rounded-none border-t safari_only'>
            {Object.values(RouteConf)
              .filter((v) => v.onNav)
              .map((config) => {
                const Ico = config.SubIcon
                return (
                  <TabsTrigger
                    key={config.key}
                    value={config.key}
                    onClick={() => router.push(config.path)}
                    className='py-2 data-[state=active]:shadow-none'
                  >
                    <div className='flex gap-2 items-center'>
                      <Ico width={16} height={16} /> {config.title}
                    </div>
                  </TabsTrigger>
                )
              })}
          </TabsList>
        </Tabs>
      </div>
    )
  }, [children, executeTab, isAdmin, isExecutePage, routeConf?.key, router])

  if (!session.data) return null

  return (
    <div className='w-full h-full bg-background md:bg-white/10 md:dark:bg-black/10 md:backdrop-blur-sm md:border md:rounded-xl md:p-2'>
      <TooltipProvider>{dyn([renderMobileView, renderDesktopView, renderDesktopView], null)}</TooltipProvider>
      <TooltipPopupContainer />
    </div>
  )
}

export default Layout
