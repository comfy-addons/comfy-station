'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStorageState } from '@/hooks/useStorageState'
import { TaskHistory } from './TaskHistory'
import { useDynamicValue } from '@/hooks/useDynamicValue'
import { useEffect, useMemo, useRef } from 'react'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { TTab, WorkflowDetailContext } from './context'
import { forceRecalculatePortal, Portal } from '@/components/Portal'

const Layout: IComponent = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useStorageState<TTab>('workflow_view_mode', 'history')
  const dyn = useDynamicValue()

  const renderMobile = useMemo(() => {
    return (
      <TabsList className='block md:hidden bg-background/40 w-full rounded-none shadow-none border-t border-b h-10'>
        <TabsTrigger value='history' className='w-1/2 data-[state=active]:text-white data-[state=active]:bg-primary'>
          History
        </TabsTrigger>
        <TabsTrigger value='visualize' className='w-1/2 data-[state=active]:text-white data-[state=active]:bg-primary'>
          Gallery
        </TabsTrigger>
      </TabsList>
    )
  }, [])

  useEffect(() => {
    const ele = document.getElementById('main-content')
    ref.current = ele as HTMLDivElement
    forceRecalculatePortal()
  }, [])

  const renderDesktop = useMemo(() => {
    return (
      <Portal target={ref}>
        <div
          className='absolute hidden md:block left-[50%] bottom-4 md:-bottom-4 z-10 shadow p-1 backdrop-blur-lg bg-background/40 rounded-lg'
          style={{
            transform: 'translateX(-50%)'
          }}
        >
          <TabsList>
            <TabsTrigger value='history'>History</TabsTrigger>
            <TabsTrigger value='visualize'>Gallery</TabsTrigger>
          </TabsList>
        </div>
      </Portal>
    )
  }, [])

  return (
    <WorkflowDetailContext.Provider value={{ viewTab: viewMode }}>
      <Tabs
        value={viewMode}
        onValueChange={(tab) => setViewMode(tab as TTab)}
        className='w-full h-full flex flex-col relative items-center justify-center'
      >
        {dyn([renderMobile, renderDesktop, renderDesktop])}
        <SimpleTransitionLayout deps={[viewMode]} className='w-full h-full relative'>
          <TabsContent value='history' className='mt-0 w-full h-full relative'>
            <TaskHistory />
          </TabsContent>
          <TabsContent value='visualize' className='w-full h-full mt-0 z-0 relative !ring-0'>
            {children}
          </TabsContent>
        </SimpleTransitionLayout>
      </Tabs>
    </WorkflowDetailContext.Provider>
  )
}

export default Layout
