import { LoadableButton } from '@/components/LoadableButton'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkflowInputArea } from '@/components/WorkflowInputArea'
import { EValueType, EValueUltilityType } from '@/entities/enum'
import { useAttachmentUploader } from '@/hooks/useAttachmentUploader'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { EKeyboardKey, ESpecialKey, useShortcutKeyEvent } from '@/hooks/useShortcutKeyEvent'
import { useStorageState } from '@/hooks/useStorageState'
import { useToast } from '@/hooks/useToast'
import { convertObjectToArrayOfObjects, seed } from '@/utils/tools'
import { trpc } from '@/utils/trpc'
import { ChevronLeft, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

export const WorkflowSidePicker: IComponent = () => {
  const { router, slug } = useCurrentRoute()
  const [loading, setLoading] = useState(false)
  const [repeat, setRepeat] = useState(1)
  const { toast } = useToast()
  const [inputData, setInputData, reload] = useStorageState<Record<string, any>>(`input-wf-${slug}`, {})
  const crrWorkflowInfo = trpc.workflow.get.useQuery(slug!, {
    enabled: !!slug
  })

  const handlePickWorkflow = (id: string) => {
    router.push(`/main/workflow/${id}`)
  }

  const workflowListLoader = trpc.workflow.listWorkflowSelections.useQuery()
  const runner = trpc.workflowTask.executeTask.useMutation()

  const seedInput = useMemo(() => {
    return Object.values(crrWorkflowInfo.data?.mapInput || {}).find((input) => input.type === EValueUltilityType.Seed)
  }, [crrWorkflowInfo.data?.mapInput])

  const { uploadAttachment } = useAttachmentUploader()

  const updateSeed = useCallback(() => {
    if (seedInput) {
      setInputData((prev) => ({
        ...prev,
        [seedInput.key]: seed()
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedInput])

  const handlePressRun = async () => {
    if (!crrWorkflowInfo.data) {
      return
    }
    setLoading(true)
    const input = crrWorkflowInfo.data.mapInput
    const inputRecord: Record<string, any> = {}
    for (const key in input) {
      const crrInput = input[key]
      if (crrInput.type === EValueType.Number) {
        inputRecord[key] = Number(inputData[key] || crrInput.default)
      }
      if ([EValueType.File, EValueType.Image].includes(crrInput.type as EValueType)) {
        const files = inputData[key] as File[]
        if (!files || files.length === 0) {
          toast({
            title: `${key} is required`,
            variant: 'destructive'
          })
          setLoading(false)
          return
        }
        const ids = await Promise.all(files.map((file) => uploadAttachment(file))).then((attach) =>
          attach.map((a) => a.id)
        )
        inputRecord[key] = ids
      } else {
        inputRecord[key] = inputData[key] || crrInput.default
      }
    }

    runner
      .mutateAsync({
        input: inputRecord,
        repeat,
        workflowId: crrWorkflowInfo.data.id
      })
      .then(() => {
        toast({
          title: 'Task has been scheduled'
        })
      })
      .catch(() => {
        toast({
          title: 'Failed to schedule task',
          variant: 'destructive'
        })
      })
      .finally(() => {
        setLoading(false)
        updateSeed()
      })
  }

  useShortcutKeyEvent(EKeyboardKey.Enter, () => handlePressRun(), ESpecialKey.Ctrl)

  const cost = useMemo(() => {
    let val = crrWorkflowInfo.data?.cost || 0
    const inputConf = crrWorkflowInfo.data?.mapInput
    const tasks = convertObjectToArrayOfObjects(inputData)
    if (inputConf) {
      for (const conf in inputConf) {
        if (inputConf[conf].cost?.related) {
          const crrValue = inputData[conf]
          if (crrValue) {
            val += Number(crrValue) * inputConf[conf].cost.costPerUnit
          }
        }
      }
    }
    return {
      value: val * repeat * tasks.length,
      subTasks: tasks.length
    }
  }, [crrWorkflowInfo.data?.cost, crrWorkflowInfo.data?.mapInput, repeat, inputData])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    if (crrWorkflowInfo.data?.name) {
      document.title = `${crrWorkflowInfo.data.name} | ComfyUI-Station`
    }
  }, [crrWorkflowInfo.data])

  return (
    <div className='w-full h-full flex flex-col items-start py-2'>
      <div className='px-2 w-full'>
        <Select defaultValue={slug} onValueChange={handlePickWorkflow}>
          <SelectTrigger>
            <SelectValue placeholder='Select...' className='w-full' />
          </SelectTrigger>
          <SelectContent>
            {workflowListLoader.data?.map((selection) => (
              <SelectItem key={selection.id} value={selection.id} className='flex flex-col w-full items-start'>
                <div className='md:w-[300px] font-semibold whitespace-normal break-words text-left'>
                  {selection.name}
                </div>
                <p className='text-xs'>{selection.description}</p>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SimpleTransitionLayout deps={[crrWorkflowInfo.data?.id || '']} className='flex-1 w-full flex flex-col relative'>
        {!!crrWorkflowInfo.data && (
          <WorkflowInputArea
            workflow={crrWorkflowInfo.data}
            onChange={(data) =>
              setInputData(data, (obj) => {
                for (const key in obj) {
                  if (!['string', 'number', 'boolean'].includes(typeof obj[key])) {
                    delete obj[key]
                  }
                }
                return obj
              })
            }
            repeat={repeat}
            data={inputData}
            onChangeRepeat={!!seedInput ? setRepeat : undefined}
          />
        )}
      </SimpleTransitionLayout>
      <div className='w-full flex flex-col gap-2 justify-end items-center border-t px-2 pt-2'>
        {cost.subTasks > 1 && (
          <span className='text-xs text-center px-4'>
            Will splitted into {cost.subTasks} sub-tasks, each cost {cost.value / cost.subTasks} credits
          </span>
        )}
        <div className='w-full flex gap-2 justify-end items-center '>
          {!!cost && <span className='text-xs text-gray-600'>Cost {cost.value} credits</span>}
          <Button
            onClick={() => {
              router.push('/main')
            }}
            className='hidden md:flex'
            variant='ghost'
          >
            Back
            <ChevronLeft className='w-4 h-4 ml-1' />
          </Button>
          <LoadableButton loading={loading} onClick={handlePressRun}>
            Run
            <Play className='w-4 h-4 ml-1' />
          </LoadableButton>
        </div>
      </div>
    </div>
  )
}
