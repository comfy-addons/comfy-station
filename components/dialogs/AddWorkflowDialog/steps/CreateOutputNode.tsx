import { IconPicker } from '@/components/IconPicker'
import { LoadableButton } from '@/components/LoadableButton'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectSeparator
} from '@/components/ui/select'
import { EValueSelectionType, EValueType } from '@/entities/enum'
import { IMapperOutput, IMapTarget } from '@/entities/workflow'
import {
  CheckIcon,
  DocumentArrowUpIcon,
  LanguageIcon,
  PhotoIcon,
  PlayCircleIcon,
  VariableIcon
} from '@heroicons/react/24/outline'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, PlusIcon, Trash } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Textarea } from '@/components/ui/textarea'
import { AddWorkflowDialogContext } from '..'
import { Input } from '@/components/ui/input'
import { ConnectionPicker } from './ConnectionPicker'
import { EHighlightType, useWorkflowVisStore } from '@/components/WorkflowVisualize/state'

export const CreateOutputNode: IComponent<{
  config?: IMapperOutput
  onHide: () => void
}> = ({ onHide, config }) => {
  const isUpdating = !!config
  const { highlightArr, updateHighlightArr, recenter } = useWorkflowVisStore()
  const { workflow, setWorkflow, rawWorkflow } = useContext(AddWorkflowDialogContext)
  const [connection, setConnection] = useState<IMapTarget | undefined>(config?.target)
  const formSchema = z.object({
    // Regex is url host name
    type: z.nativeEnum(EValueType),
    icon: z.string().optional(),
    name: z.string(),
    joinArray: z.boolean().optional(),
    description: z.string().optional()
  })
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: config?.type as EValueType,
      icon: config?.iconName,
      name: config?.key,
      description: config?.description,
      joinArray: config?.joinArray
    }
  })

  const mappingType = form.watch('type')

  useEffect(() => {
    if (mappingType === config?.type) return
    switch (mappingType) {
      case EValueType.Number:
        form.setValue('icon', 'VariableIcon')
        break
      case EValueType.String:
        form.setValue('icon', 'LanguageIcon')
        break
      case EValueType.Image:
        form.setValue('icon', 'PhotoIcon')
        break
      case EValueType.Video:
        form.setValue('icon', 'PlayCircleIcon')
        break
      case EValueType.File:
        form.setValue('icon', 'DocumentArrowUpIcon')
        break
      case EValueType.Boolean:
        form.setValue('icon', 'CheckIcon')
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingType])

  const handleSubmit = form.handleSubmit((data) => {
    if (!connection) return
    if (config) {
      // Update current config
      setWorkflow?.((prev) => ({
        ...workflow,
        mapOutput: {
          ...prev?.mapOutput,
          [config.key]: {
            ...config,
            ...data,
            key: data.name,
            iconName: data.icon,
            target: connection
          }
        }
      }))
    } else {
      setWorkflow?.((prev) => ({
        ...workflow,
        mapOutput: {
          ...prev?.mapOutput,
          [data.name]: {
            ...data,
            iconName: data.icon,
            key: data.name,
            target: connection
          }
        }
      }))
    }
    updateHighlightArr(
      highlightArr.map((hl) => {
        if (hl.id === connection.nodeName) {
          return { id: connection.nodeName, type: EHighlightType.OUTPUT }
        }
        return hl
      })
    )
    recenter?.()
    onHide()
  })

  const handlePressDelete = () => {
    if (config) {
      setWorkflow?.((prev) => {
        const { [config.key]: _, ...rest } = prev?.mapOutput || {}
        return {
          ...prev,
          mapOutput: rest
        }
      })
      updateHighlightArr(
        highlightArr.filter((hl) => {
          return hl.id !== connection?.nodeName
        })
      )
    }
    onHide()
  }

  return (
    <Form {...form}>
      <form className='w-full h-full flex flex-col' onSubmit={handleSubmit}>
        <div className='space-y-2 h-auto'>
          <h1 className='font-semibold mb-1'>{isUpdating ? 'UPDATE' : 'CREATE'} OUTPUT NODE</h1>
          <FormField
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>CHOOSE YOUR TYPE OF INPUT</FormLabel>
                <div className='flex gap-2'>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type of output' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Normal output</SelectLabel>
                        <SelectItem value={EValueType.Number}>
                          <div className='flex items-center'>
                            <VariableIcon className='mr-2 h-4 w-4' />
                            Number
                          </div>
                        </SelectItem>
                        <SelectItem value={EValueType.String}>
                          <div className='flex items-center'>
                            <LanguageIcon className='mr-2 h-4 w-4' />
                            String
                          </div>
                        </SelectItem>
                        <SelectItem value={EValueType.Boolean}>
                          <div className='flex items-center'>
                            <CheckIcon className='mr-2 h-4 w-4' />
                            Boolean
                          </div>
                        </SelectItem>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Media output</SelectLabel>
                          <SelectItem value={EValueType.Image}>
                            <div className='flex items-center'>
                              <PhotoIcon className='mr-2 h-4 w-4' />
                              Image
                            </div>
                          </SelectItem>
                          <SelectItem value={EValueType.Video}>
                            <div className='flex items-center'>
                              <PlayCircleIcon className='mr-2 h-4 w-4' />
                              Video
                            </div>
                          </SelectItem>
                          <SelectItem value={EValueType.File}>
                            <div className='flex items-center'>
                              <DocumentArrowUpIcon className='mr-2 h-4 w-4' />
                              File
                            </div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <IconPicker value={form.watch('icon')} onSelect={(name) => form.setValue('icon', name)} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Your output name...' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder='Your output description...' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!!rawWorkflow && (
            <ConnectionPicker
              isOutput
              connection={connection}
              onChange={(connection) => setConnection(connection)}
              workflow={rawWorkflow}
            />
          )}
        </div>
        <div className='flex gap-2 pt-2 w-full items-center'>
          {isUpdating && (
            <Button onClick={handlePressDelete} variant='destructive' className=''>
              Delete
              <Trash width={16} height={16} className='ml-2' />
            </Button>
          )}
          <Button onClick={onHide} variant='secondary' className='ml-auto'>
            Back
            <ChevronLeft width={16} height={16} className='ml-2' />
          </Button>
          <LoadableButton>
            {isUpdating ? 'Update' : 'Create'}
            {isUpdating ? <CheckIcon width={16} height={16} className='ml-2' /> : <PlusIcon width={16} height={16} />}
          </LoadableButton>
        </div>
      </form>
    </Form>
  )
}
