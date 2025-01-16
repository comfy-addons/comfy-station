import { AnimateDiv } from '@/components/AnimateDiv'
import { ResourceItem } from '@/components/ResourceItem'
import { cn } from '@/utils/style'
import { AddClientDialogContext, EImportStep } from '.'
import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { trpc } from '@/utils/trpc'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { CheckpointLoraItem } from './CheckpointLoraItem'
import { InputItem } from '@/components/InputItem'
import { Blocks, ChevronLeftIcon, ChevronsUpDown, Code, Home, Lock, Save, Tag } from 'lucide-react'
import { LoadableButton } from '@/components/LoadableButton'
import { Button } from '@/components/ui/button'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AccordionItem, AccordionTrigger, AccordionContent } from '@radix-ui/react-accordion'
import { toReadableName } from '@/utils/node'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@radix-ui/react-collapsible'
import { EResourceType } from '@/entities/enum'

const extraCls = 'border rounded-lg bg-secondary/20 shadow-inner'

enum EActiveTab {
  Checkpoints,
  Extensions,
  Loras,
  Samplers,
  Schedulers
}

export const InformationCheckingStep: IComponent = () => {
  const parentRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<EActiveTab>(EActiveTab.Checkpoints)
  const { clientInfo, setStep, setDisplayName } = useContext(AddClientDialogContext)
  const { data, isLoading } = trpc.client.getResourcesNewClient.useQuery(
    {
      host: clientInfo!.host,
      auth: clientInfo!.auth,
      username: clientInfo!.username,
      password: clientInfo!.password
    },
    { enabled: clientInfo !== undefined }
  )

  const itemCount = useMemo(() => {
    switch (activeTab) {
      case EActiveTab.Checkpoints:
        return data?.checkpoints.length
      case EActiveTab.Extensions:
        return Object.keys(data?.extensions ?? {}).length
      case EActiveTab.Loras:
        return data?.lora.length
      case EActiveTab.Samplers:
        return data?.samplerInfo.sampler?.[0].length
      case EActiveTab.Schedulers:
        return data?.samplerInfo.scheduler?.[0].length
      default:
        return 0
    }
  }, [
    activeTab,
    data?.checkpoints.length,
    data?.extensions,
    data?.lora.length,
    data?.samplerInfo.sampler,
    data?.samplerInfo.scheduler
  ])

  const rowVirtualizer = useVirtualizer({
    count: itemCount ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 288
  })

  const items = rowVirtualizer.getVirtualItems()

  const renderItem = useCallback(
    (idx: number) => {
      if (!data) return null
      switch (activeTab) {
        case EActiveTab.Checkpoints:
          const ckpgName = data.checkpoints[idx]
          if (!ckpgName) return null
          return <CheckpointLoraItem key={ckpgName} resourceFileName={ckpgName} />
        case EActiveTab.Extensions:
          const extName = Object.keys(data.extensions ?? {})[idx]
          if (!extName) return null
          const extNodes = data.extensions[extName]
          const name = toReadableName(extName)
          return (
            <Collapsible>
              <CollapsibleTrigger className='p-2 px-4 w-full flex gap-2 items-center'>
                <Blocks width={16} height={16} />
                {name}
                <span className='ml-auto text-xs text-secondary-foreground'>{extNodes.length} nodes</span>
                <ChevronsUpDown className='h-4 w-4' />
              </CollapsibleTrigger>
              <CollapsibleContent className='bg-secondary/50 shadow-inner divide-y-[1px]'>
                {extNodes.map((node) => {
                  return (
                    <div key={node.name} className='p-2 pl-4 flex gap-4'>
                      <Code width={16} height={16} className='min-w-fit mt-1' />
                      <div>
                        <h1 className='font-semibold'>{node.name}</h1>
                        <p className='text-sm'>{node.description}</p>
                      </div>
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        case EActiveTab.Loras:
          const lora = data.lora[idx]
          if (!lora) return null
          return <CheckpointLoraItem key={lora} resourceFileName={lora} type={EResourceType.Lora} />
        case EActiveTab.Samplers:
          const sampler = data.samplerInfo.sampler?.[0][idx]
          if (!sampler) return null
          return (
            <div key={sampler} className='p-2 pl-4 flex gap-4'>
              <Code width={16} height={16} className='min-w-fit mt-1' />
              <div>
                <h1 className='font-semibold'>{sampler}</h1>
              </div>
            </div>
          )
        case EActiveTab.Schedulers:
          const scheduler = data.samplerInfo.scheduler?.[0][idx]
          if (!scheduler) return null
          return (
            <div key={scheduler} className='p-2 pl-4 flex gap-4'>
              <Code width={16} height={16} className='min-w-fit mt-1' />
              <div>
                <h1 className='font-semibold'>{scheduler}</h1>
              </div>
            </div>
          )
        default:
          return null
      }
    },
    [activeTab, data]
  )

  const renderListContent = useMemo(() => {
    return items.map((virtualRow) => {
      return (
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          ref={rowVirtualizer.measureElement}
          className={virtualRow.index % 2 ? 'ListItemOdd' : 'ListItemEven'}
        >
          {renderItem(virtualRow.index)}
        </div>
      )
    })
  }, [items, renderItem, rowVirtualizer.measureElement])

  return (
    <div className='absolute top-0 w-full h-full flex gap-2'>
      <AnimateDiv className={cn('w-1/4 p-2 space-y-2', extraCls)}>
        <ResourceItem
          active={activeTab === EActiveTab.Checkpoints}
          onClick={() => setActiveTab(EActiveTab.Checkpoints)}
          title='Checkpoints'
          description='List of available checkpoint in this server'
          loading={isLoading}
          count={data?.checkpoints.length}
        />
        <ResourceItem
          active={activeTab === EActiveTab.Extensions}
          onClick={() => setActiveTab(EActiveTab.Extensions)}
          title='Extensions'
          description='List of available extensions in this server'
          loading={isLoading}
          count={data ? Object.keys(data.extensions).length : undefined}
        />
        <ResourceItem
          active={activeTab === EActiveTab.Loras}
          onClick={() => setActiveTab(EActiveTab.Loras)}
          title='Loras'
          description='List of available lora in this server'
          loading={isLoading}
          count={data?.lora.length}
        />
        <ResourceItem
          active={activeTab === EActiveTab.Samplers}
          onClick={() => setActiveTab(EActiveTab.Samplers)}
          title='Samplers'
          description={data?.samplerInfo.sampler?.[1]?.tooltip ?? 'List of available sampler in this server'}
          loading={isLoading}
          count={data?.samplerInfo.sampler?.[0]?.length}
        />
        <ResourceItem
          active={activeTab === EActiveTab.Schedulers}
          onClick={() => setActiveTab(EActiveTab.Schedulers)}
          title='Schedulers'
          description={data?.samplerInfo.scheduler?.[1]?.tooltip ?? 'List of available scheduler in this server'}
          loading={isLoading}
          count={data?.samplerInfo.scheduler?.[0]?.length}
        />
      </AnimateDiv>
      <AnimateDiv delayShow={200} className={cn('w-2/4', extraCls)}>
        <SimpleTransitionLayout deps={[activeTab]} className='h-full'>
          <div ref={parentRef} className='h-full divide-y-[1px] overflow-y-auto contain-strict'>
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                width: '100%',
                position: 'relative'
              }}
            >
              <div
                className=' divide-y-[1px]'
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${items[0]?.start ?? 0}px)`
                }}
              >
                {renderListContent}
              </div>
            </div>
          </div>
        </SimpleTransitionLayout>
      </AnimateDiv>
      <AnimateDiv delayShow={400} className={cn('w-1/4 p-2', extraCls)}>
        <h1 className='font-semibold'>NODE INFORMATION</h1>
        <p className='text-sm font-light'>Input the node details before created</p>
        <div className='mt-3 flex flex-col gap-3'>
          <InputItem
            Icon={Home}
            title='SERVER ADDRESS'
            description='Current address of this node'
            value={clientInfo?.host}
          />
          <InputItem
            Icon={Lock}
            title='AUTHENTICATION'
            description='Authentication mode of this mode'
            value={clientInfo?.auth ? 'Enabled' : 'Disabled'}
          />
          <InputItem
            Icon={Tag}
            title='NODE NAME'
            description='Naming for this node'
            inputType='input'
            value={clientInfo?.displayName ?? ''}
            onChange={(e) => setDisplayName?.(e)}
            placeholder={clientInfo?.host}
          />
        </div>
        <div className='flex gap-2 w-full justify-end mt-4'>
          <Button onClick={() => setStep?.(EImportStep.FEATURE_CHECKING)} variant='secondary' className=''>
            Back
            <ChevronLeftIcon width={16} height={16} className='ml-2' />
          </Button>
          <LoadableButton onClick={() => setStep?.(EImportStep.IMPORTING)}>
            Add
            <Save width={16} height={16} className='ml-2' />
          </LoadableButton>
        </div>
      </AnimateDiv>
    </div>
  )
}
