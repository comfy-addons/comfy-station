import { ReactNode, useContext, useMemo, useRef, useState } from 'react'
import { AddWorkflowDialogContext, EImportStep } from '..'
import { WorkflowInformation } from './WorkflowInformation'
import { ViewInputNode } from './ViewInputNode'
import { ViewOutputNode } from './ViewOutputNode'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadableButton } from '@/components/LoadableButton'
import { Check, ChevronLeft, Download, Play, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trpc } from '@/utils/trpc'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { Label } from '@/components/ui/label'
import { EValueSelectionType, EValueType, EValueUtilityType } from '@/entities/enum'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import DropFileInput from '@/components/DropFileInput'
import { CardDescription } from '@/components/ui/card'
import { useAttachmentUploader } from '@/hooks/useAttachmentUploader'
import { TWorkflowProgressMessage } from '@/types/task'
import { LoadingSVG } from '@/components/svg/LoadingSVG'
import { PhotoView } from 'react-photo-view'
import { useWorkflowVisStore } from '@/components/WorkflowVisualize/state'
import { z } from 'zod'
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cloneDeep } from 'lodash'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/useToast'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'

const SelectionSchema = z.nativeEnum(EValueSelectionType)

export const FinalizeStep: IComponent = () => {
  const [loading, setLoading] = useState(false)
  const [progressEv, setProgressEv] = useState<TWorkflowProgressMessage>()
  const [previewBlob, setPreviewBlob] = useState<Blob>()
  const inputWorkflowTest = useRef<Record<string, any>>({})
  const [testMode, setTestMode] = useState(false)
  const { setStep, workflow, setWorkflow, rawWorkflow, setDialog, setRawWorkflow } =
    useContext(AddWorkflowDialogContext)

  const { uploadAttachment } = useAttachmentUploader()
  const { toast } = useToast()
  const { updateProcessing, recenter, updateHightlightArr } = useWorkflowVisStore()

  const isEnd = progressEv?.key === 'finished' || progressEv?.key === 'failed'

  trpc.workflow.testWorkflow.useSubscription(undefined, {
    onData: (ev) => {
      if (ev.key === 'preview') {
        const base64 = ev.data.blob64
        const blob = base64 ? new Blob([Buffer.from(base64, 'base64')]) : undefined
        setPreviewBlob(blob)
        return
      }

      setProgressEv(ev)
      if (ev.key === 'failed' || ev.key === 'finished') {
        setLoading(false)
        updateProcessing()
        recenter?.()
      }
      if (ev.key === 'progress') {
        updateProcessing(`${ev.data.node}`)
      }
    }
  })
  const { mutateAsync } = trpc.workflow.startTestWorkflow.useMutation()
  const submitter = trpc.workflow.importWorkflow.useMutation()

  const handlePressTest = async () => {
    if (!workflow) return
    const wfObj = cloneDeep(inputWorkflowTest.current)
    // Check if there are files to upload
    const inputKeys = Object.keys(workflow?.mapInput || {})
    for (const key of inputKeys) {
      const input = workflow?.mapInput?.[key as keyof typeof workflow.mapInput]
      if (!input) continue
      if (input.type === EValueType.File || input.type === EValueType.Image || input.type === EValueType.Video) {
        const files = wfObj[key] as File[]
        if (files.length > 0) {
          const file = files[0]
          if (file instanceof File) {
            wfObj[key] = await uploadAttachment(file)
          }
        }
      }
    }
    setLoading(true)
    mutateAsync({
      workflow,
      input: wfObj
    })
  }

  const handlePressSubmitWorkflow = async () => {
    if (rawWorkflow) {
      try {
        setLoading(true)
        await submitter.mutateAsync({
          ...workflow,
          rawWorkflow: JSON.stringify(rawWorkflow)
        })
        toast({
          title: 'Workflow submitted successfully'
        })
        setRawWorkflow?.(undefined)
        setWorkflow?.(undefined)
        updateHightlightArr([])
        setStep?.(EImportStep.S0_UPLOAD_WORKFLOW)
        setDialog?.(false)
        dispatchGlobalEvent(EGlobalEvent.RLOAD_WORKFLOW)
      } catch (e) {
        toast({
          title: 'Failed to submit workflow',
          variant: 'destructive'
        })
        console.warn(e)
      } finally {
        setLoading(true)
      }
    }
  }

  const renderContent = useMemo(() => {
    if (testMode) {
      const inputKeys = Object.keys(workflow?.mapInput || {})
      return inputKeys.map((val) => {
        const input = workflow?.mapInput?.[val as keyof typeof workflow.mapInput]
        if (!input) return null

        return (
          <div key={val} className='flex flex-col gap-2 mb-3'>
            <Label>{input.key}</Label>
            {input.type === EValueType.String && (
              <Textarea
                disabled={loading}
                onChange={(e) => {
                  inputWorkflowTest.current[val] = e.target.value
                }}
                defaultValue={String(input.default ?? '')}
              />
            )}
            {[EValueType.File, EValueType.Image, EValueType.Video].includes(input.type as EValueType) && (
              <DropFileInput
                disabled={loading}
                defaultFiles={inputWorkflowTest.current[val]}
                maxFiles={1}
                onChanges={(files) => {
                  inputWorkflowTest.current[val] = files
                }}
              />
            )}
            {[EValueType.Number, EValueUtilityType.Seed].includes(input.type as EValueType) && (
              <Input
                disabled={loading}
                defaultValue={String(input.default ?? '')}
                onChange={(e) => {
                  inputWorkflowTest.current[val] = e.target.value
                }}
                type='number'
              />
            )}
            {SelectionSchema.safeParse(input.type).success && (
              <Select
                defaultValue={String(input.default ?? '')}
                onValueChange={(value) => {
                  inputWorkflowTest.current[val] = value
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select...' />
                </SelectTrigger>
                <SelectContent>
                  {input.selections!.map((selection) => (
                    <SelectItem key={selection.value} value={selection.value}>
                      <div className='w-[300px] whitespace-normal break-words text-left'>{selection.value}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!!input.description && <CardDescription>{input.description}</CardDescription>}
          </div>
        )
      })
    }
    return (
      <>
        <WorkflowInformation readonly />
        <div className='mt-3' />
        <ViewInputNode readonly />
        <div className='mt-3' />
        <ViewOutputNode readonly />
        <div className='pb-10' />
      </>
    )
  }, [testMode, workflow, loading])

  const renderEventStatus = useMemo(() => {
    if (!progressEv) return null
    return (
      <div className='flex flex-col gap-2'>
        {!!previewBlob && (
          <div className='w-full flex gap-2'>
            <img src={URL.createObjectURL(previewBlob)} alt='preview' className='w-20 h-20 object-cover rounded-xl' />
          </div>
        )}
        <Label>Status</Label>
        {!isEnd && (
          <div className='flex flex-row gap-2 items-center animate-pulse'>
            <LoadingSVG width={16} height={16} />
            {progressEv.key === 'init' && <Label>Initializing...</Label>}
            {progressEv.key === 'loading' && <Label>Loading resources...</Label>}
            {progressEv.key === 'progress' && (
              <Label>
                Running at node {progressEv.data.node}, {progressEv.data.value}/{progressEv.data.max}...
              </Label>
            )}
            {progressEv.key === 'downloading_output' && <Label>Finished, downloading outputs...</Label>}
            {progressEv.key === 'uploading_output' && <Label>Finished, uploading attachments...</Label>}
          </div>
        )}
        {progressEv.key === 'failed' && (
          <div className='flex flex-col gap-2'>
            <div className='flex gap-2 items-center w-full'>
              <X width={16} height={16} className='text-destructive' />
              <Label>Failed</Label>
            </div>
            <span className='text-xs'>{progressEv.detail}</span>
          </div>
        )}
        {progressEv.key === 'finished' && (
          <div className='flex flex-col gap-2 items-center'>
            <div className='flex gap-2 items-center w-full'>
              <Check width={16} height={16} className='text-green-500' />
              <Label>Finished</Label>
            </div>
            <div className='w-full flex flex-col gap-2'>
              {Object.keys(progressEv.data.output).map((key) => {
                const data = progressEv.data.output[key as keyof typeof progressEv.data]
                let items: ReactNode[] = []
                switch (data.info.type) {
                  case EValueType.Video:
                  case EValueType.Image:
                    const imageURLs = data.data as { url: string }[]
                    items.push(
                      ...imageURLs.map((url, idx) => (
                        <PhotoView key={idx} src={url.url}>
                          <img alt='output' src={url.url} className='w-20 h-20 object-cover rounded-xl' />
                        </PhotoView>
                      ))
                    )
                    break
                  case EValueType.File:
                    const filesURLs = data.data as { url: string }[]
                    items.push(
                      ...filesURLs.map((url, idx) => (
                        <a key={idx} href={url.url} target='_blank' rel='noreferrer'>
                          <Download className='w-4 h-4' />
                        </a>
                      ))
                    )
                    break
                  case EValueType.Boolean: {
                    const rItem = Boolean(data.data)
                    items = [<Switch key='Boolean' checked={rItem} disabled />]
                    break
                  }
                  default: {
                    const rItem = String(data.data)
                    items = [<p key='String'>{rItem}</p>]
                    break
                  }
                }
                return (
                  <div key={key} className='w-full flex gap-2 flex-col'>
                    <Label>{key}</Label>
                    <div className='w-full flex gap-2'>{items}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }, [isEnd, previewBlob, progressEv])

  return (
    <div className='absolute top-0 left-0 flex flex-col w-full h-full'>
      <h1 className='font-semibold px-2'>FINALIZE</h1>
      <ScrollArea className='flex-1'>
        <SimpleTransitionLayout deps={[String(testMode)]} className='p-2'>
          {renderContent}
          {renderEventStatus}
        </SimpleTransitionLayout>
      </ScrollArea>
      <div className='flex justify-end items-center w-full border-t p-2 gap-1'>
        {testMode ? (
          <>
            <Button onClick={() => setTestMode(false)} variant='ghost'>
              Back <ChevronLeft className='w-4 h-4 ml-1' />
            </Button>
            <LoadableButton loading={loading} onClick={handlePressTest}>
              Run <Play className='w-4 h-4 ml-1' />
            </LoadableButton>
          </>
        ) : (
          <>
            <Button onClick={() => setTestMode(true)} variant='ghost'>
              Test workflow <Play className='w-4 h-4 ml-1' />
            </Button>
            <LoadableButton onClick={handlePressSubmitWorkflow}>
              Submit <Save className='w-4 h-4 ml-1' />
            </LoadableButton>
          </>
        )}
      </div>
    </div>
  )
}
