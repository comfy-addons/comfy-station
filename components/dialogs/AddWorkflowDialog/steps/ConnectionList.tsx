import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { IMapTarget } from '@/entities/workflow'
import { useKeygen } from '@/hooks/useKeygen'
import { ChevronsLeftRight, PlusIcon, Trash2, TriangleAlertIcon } from 'lucide-react'
import { useCallback, useContext, useMemo, useState } from 'react'
import { AddWorkflowDialogContext } from '..'
import { ConnectionPicker } from './ConnectionPicker'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ArrowLongRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { EHighlightType, useWorkflowVisStore } from '@/components/WorkflowVisualize/state'

export const ConnectionList: IComponent<{
  connections: Array<IMapTarget>
  onUpdate: (connections: Array<IMapTarget>, nodeCrrVal?: string | number | boolean) => void
}> = ({ connections, onUpdate }) => {
  const [openInput, setOpenInput] = useState(false)
  const { highlightArr, updateHighlightArr } = useWorkflowVisStore()
  const { rawWorkflow } = useContext(AddWorkflowDialogContext)
  const { gen } = useKeygen()
  const handleAddConnection = (connection: IMapTarget, nodeCrrVal?: string | number | boolean) => {
    const oldData = highlightArr.find((hl) => hl.id === connection.nodeName)
    if (!oldData) {
      updateHighlightArr([...highlightArr, { id: connection.nodeName, type: EHighlightType.INPUT }])
    } else {
      updateHighlightArr(
        highlightArr.map((hl) => {
          if (hl.id === connection.nodeName) {
            return { id: connection.nodeName, type: EHighlightType.INPUT }
          }
          return hl
        })
      )
    }
    onUpdate([...connections, connection], nodeCrrVal)
    setOpenInput(false)
  }

  const handleDeleteConnection = useCallback(
    (connection: IMapTarget) => {
      const oldData = highlightArr.find((hl) => hl.id === connection.nodeName)
      if (oldData) {
        updateHighlightArr(highlightArr.filter((hl) => hl.id !== connection.nodeName))
      }
      onUpdate(connections.filter((c) => c !== connection))
    },
    [connections, highlightArr, onUpdate, updateHighlightArr]
  )

  const renderConnections = useMemo(() => {
    if (connections.length === 0) {
      return (
        <div className='w-full mt-auto text-center flex items-center justify-center gap-2'>
          <span className='text-muted-foreground'>No connections</span>
          <TriangleAlertIcon width={20} height={20} className='text-orange-500' />
        </div>
      )
    }
    return connections.map((connection) => {
      const node = rawWorkflow?.[connection.nodeName]
      return (
        <div key={gen(connection)} className='w-full'>
          <div className='flex items-center gap-2 w-full flex-wrap'>
            <ChevronsLeftRight width={20} height={20} />
            <div className='flex flex-1 flex-wrap items-center space-x-2'>
              <div className='flex items-center space-x-2'>
                <span>
                  {node?.info?.displayName || node?.info?.name || node?.class_type || '-'} (#{connection.nodeName})
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <ArrowLongRightIcon width={18} height={18} />
                <div className='flex items-center space-x-2 capitalize'>
                  <span>{connection.keyName}</span>
                </div>
              </div>
            </div>
            <Button
              size='icon'
              className='ml-auto'
              variant='outline'
              onClick={() => handleDeleteConnection(connection)}
            >
              <Trash2 width={16} height={16} />
            </Button>
          </div>
        </div>
      )
    })
  }, [connections, gen, handleDeleteConnection, rawWorkflow])

  return (
    <>
      <Label>Mapped to nodes</Label>
      <div className='w-full border rounded-lg min-h-[200px] flex flex-col gap-2 p-2 relative'>
        {renderConnections}
        <div className='mt-auto w-full flex justify-end'>
          {!!rawWorkflow && (
            <Popover open={openInput} modal onOpenChange={setOpenInput}>
              <PopoverTrigger asChild>
                <Button role='combobox' size='icon' aria-expanded={openInput}>
                  <PlusIcon width={16} height={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='p-2 w-[320px]'>
                <ConnectionPicker
                  onCanceled={() => {
                    setOpenInput(false)
                  }}
                  onPicked={handleAddConnection}
                  workflow={rawWorkflow}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </>
  )
}
