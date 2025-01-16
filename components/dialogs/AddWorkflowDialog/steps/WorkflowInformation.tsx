import { LoadableButton } from '@/components/LoadableButton'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useContext } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AddWorkflowDialogContext, EImportStep } from '..'
import { cn } from '@/utils/style'

export const WorkflowInformation: IComponent<{
  readonly?: boolean
}> = ({ readonly }) => {
  const { setStep, workflow, setWorkflow } = useContext(AddWorkflowDialogContext)
  const formSchema = z.object({
    // Regex is url host name
    name: z.string().min(2, { message: 'Workflow name must be at least 2 characters' }),
    description: z.string().optional(),
    baseCost: z.coerce.number().int().min(0, { message: 'Base cost can not be negative' }).default(0),
    baseWeight: z.coerce.number().default(0),
    hideWorkflow: z.boolean().default(false),
    allowLocalhost: z.boolean().default(false)
  })
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    disabled: readonly,
    defaultValues: {
      name: workflow?.name,
      description: workflow?.description,
      baseCost: workflow?.cost,
      baseWeight: workflow?.baseWeight,
      hideWorkflow: workflow?.hideWorkflow,
      allowLocalhost: workflow?.allowLocalhost
    }
  })

  const handlePressSubmit = form.handleSubmit((data) => {
    setWorkflow?.((prev) => ({
      ...prev,
      name: data.name,
      description: data.description,
      cost: data.baseCost,
      baseWeight: data.baseWeight,
      hideWorkflow: data.hideWorkflow,
      allowLocalhost: data.allowLocalhost
    }))
    setStep?.(EImportStep.S2_MAPPING_INPUT)
  })
  return (
    <>
      <h1
        className={cn('font-semibold', {
          'text-sm': readonly
        })}
      >
        WORKFOW INFORMATION
      </h1>
      <Form {...form}>
        <form className='space-y-4 min-w-80' onSubmit={handlePressSubmit}>
          <FormField
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter your workflow name here....' {...field} />
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
                  <Textarea placeholder='Workflow description..... (Markdown supported)' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='baseCost'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Cost</FormLabel>
                <FormControl>
                  <Input placeholder='0' type='number' {...field} />
                </FormControl>
                <FormDescription>For estimate user’s balance when using this workflow.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='baseWeight'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Weight</FormLabel>
                <FormControl>
                  <Input placeholder='0' type='number' {...field} />
                </FormControl>
                <FormDescription>
                  For estimate workflow priority when executing in queue. More weight mean lower priority. This value
                  can be negative.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='hideWorkflow'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center space-x-2'>
                  <Switch disabled={readonly} checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor='airplane-mode'>Hide workflow from user</Label>
                </div>
                <FormDescription>
                  Only admin and editor can view full workflow executing. User can only seen some parts of it.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='allowLocalhost'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center space-x-2'>
                  <Switch disabled={readonly} checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor='airplane-mode'>Allow execute with localhost</Label>
                </div>
                <FormDescription>
                  Allow user using their localhost Comfyui client to execute the workflow. This will turn off the hide
                  workflow option because it running on client side.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {!readonly && (
            <div className='flex justify-end w-full'>
              <LoadableButton type='submit' color='primary'>
                Next <ArrowRight className='ml-2 w-4 h-4' />
              </LoadableButton>
            </div>
          )}
        </form>
      </Form>
    </>
  )
}
