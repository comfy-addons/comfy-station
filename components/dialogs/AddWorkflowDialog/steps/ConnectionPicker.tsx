import { IMapTarget } from '@/entities/workflow'
import { FormField, FormItem, FormLabel, Form, FormControl } from '@/components/ui/form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { EHighlightType, useWorkflowVisStore } from '@/components/WorkflowVisualize/state'
import { useEffect, useMemo } from 'react'
import { LoadableButton } from '@/components/LoadableButton'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useActionDebounce } from '@/hooks/useAction'

export const ConnectionPicker: IComponent<{
  workflow: IWorkflow
  isOutput?: boolean
  connection?: IMapTarget
  onCanceled?: () => void
  onChange?: (connection: IMapTarget) => void
  onPicked?: (connection: IMapTarget, defaultVal?: string | number | boolean) => void
}> = ({ workflow, isOutput, connection, onChange, onCanceled, onPicked }) => {
  const { highlightArr, updateHighlightArr, recenter } = useWorkflowVisStore()
  const formSchema = z.object({
    nodeName: z.string(),
    keyName: z.string().optional(),
    mapVal: z.string()
  })
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: connection
  })
  const handleSubmit = form.handleSubmit(async (data) => {})

  const debounce = useActionDebounce(340, true)

  const pickedNode = form.watch('nodeName')
  const pickedInput = form.watch('keyName')
  const listOfNodes = Object.keys(workflow)
  const listOfKeys = workflow[pickedNode]?.info?.inputConf

  const currentNodeValue = useMemo(() => {
    if (!pickedNode || !pickedInput) return undefined
    return workflow[pickedNode].inputs[pickedInput]
  }, [pickedInput, pickedNode, workflow])

  const handlePicking = (node: string) => {
    debounce(() => {
      const oldData = highlightArr.find((hl) => hl.type === EHighlightType.SELECTING)
      if (!oldData) {
        updateHighlightArr([...highlightArr, { id: node, type: EHighlightType.SELECTING }])
      } else {
        updateHighlightArr(
          highlightArr.map((hl) => {
            if (hl.type === EHighlightType.SELECTING) {
              return { id: node, type: EHighlightType.SELECTING }
            }
            return hl
          })
        )
      }
    })
  }

  const handlePressCheck = () => {
    if (!pickedNode || !pickedInput) return
    let nodeVal: string | number | boolean = ''
    if (currentNodeValue && z.union([z.string(), z.number(), z.boolean()]).safeParse(currentNodeValue).success) {
      nodeVal = currentNodeValue as string | number | boolean
    }
    onPicked?.({ nodeName: pickedNode, keyName: pickedInput, mapVal: `${pickedNode}.inputs.${pickedInput}` }, nodeVal)
    recenter?.()
  }

  useEffect(() => {
    if (!pickedNode) return
    onChange?.({ nodeName: pickedNode, keyName: pickedInput ?? '', mapVal: `${pickedNode}` })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedNode, pickedInput])

  const renderKeySelections = useMemo(() => {
    if (isOutput) {
      return workflow[pickedNode]?.info?.outputConf?.map((output) => {
        return (
          <SelectItem key={output.name} value={output.name}>
            <div className='flex items-center'>{output.name}</div>
          </SelectItem>
        )
      })
    }
    return Object.keys(listOfKeys || {}).map((key) => {
      return (
        <SelectItem key={key} value={key}>
          <div className='flex items-center'>{key}</div>
        </SelectItem>
      )
    })
  }, [isOutput, listOfKeys, pickedNode, workflow])

  return (
    <Form {...form}>
      <form className='w-full h-full flex flex-col' onSubmit={handleSubmit}>
        <div className='space-y-2 h-auto'>
          {!isOutput && <h1 className='font-semibold mb-1'>CREATE INPUT NODE</h1>}
          <FormField
            name='nodeName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose node</FormLabel>
                <div className='flex gap-2'>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a node to bind output' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {listOfNodes
                        .filter((node) => !isOutput || !!workflow[node]?.info?.outputNode)
                        .map((node) => {
                          const nodeInfo = workflow[node]
                          const name = nodeInfo.info?.displayName || nodeInfo.info?.name || nodeInfo.class_type
                          return (
                            <SelectItem onFocus={() => handlePicking(node)} key={node} value={node}>
                              <div className='flex items-center'>
                                <strong className='mr-1'>#{node}</strong>
                                {name}
                              </div>
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </FormItem>
            )}
          />
          {!!renderKeySelections?.length && (
            <FormField
              name='keyName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choose output key</FormLabel>
                  <div className='flex gap-2'>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a output key' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>{renderKeySelections}</SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )}
            />
          )}
          {!!currentNodeValue && (
            <div className='bg-secondary p-2 text-xs rounded-md break-words'>
              <strong>Current value:</strong> {currentNodeValue}
            </div>
          )}
          <div className='w-full gap-2 flex justify-end'>
            {!!onCanceled && (
              <Button type='button' onClick={onCanceled} variant='secondary' className=''>
                Cancel
                <XMarkIcon width={16} height={16} className='ml-2' />
              </Button>
            )}
            {!!onPicked && (
              <LoadableButton type='button' disabled={!pickedNode || !pickedInput} onClick={handlePressCheck}>
                Save
                <Check width={16} height={16} className='ml-2' />
              </LoadableButton>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}
