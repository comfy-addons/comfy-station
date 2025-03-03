import { PlusIcon } from '@radix-ui/react-icons'
import { Button } from '../../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog'

import { createContext, Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'

import { cn } from '@/utils/style'
import { UploadWorkflow } from './UploadWorkflow'
import { WorkflowVisualize } from '@/components/WorkflowVisualize'
import { Replace, Trash, XIcon } from 'lucide-react'
import { WorkflowConfiguration } from './WorkflowConfiguration'
import { Workflow } from '@/entities/workflow'
import { useWorkflowVisStore } from '@/components/WorkflowVisualize/state'
import { useWorkflowStore } from '@/states/workflow'
import { trpc } from '@/utils/trpc'

export enum EImportStep {
  'S0_UPLOAD_WORKFLOW',
  'S1_WORKFLOW_INFO',
  'S2_MAPPING_INPUT',
  'S3_MAPPING_OUTPUT',
  'S4_FINALIZE'
}

interface IAddWorkflowContext {
  show?: boolean
  currentStep: EImportStep
  rawWorkflow?: IWorkflow
  workflow?: Partial<Workflow>
  setRawWorkflow?: (workflow?: IWorkflow) => void
  setWorkflow?: Dispatch<SetStateAction<Partial<Workflow> | undefined>>
  setDialog?: (show: boolean) => void
  setStep?: (step: EImportStep) => void
}

export const AddWorkflowDialogContext = createContext<IAddWorkflowContext>({
  currentStep: EImportStep.S0_UPLOAD_WORKFLOW
})

export const AddWorkflowDialog: IComponent = () => {
  const { showDialog, setShowDialog, targetWfId, setTargetWfId } = useWorkflowStore()
  const { updateHighlightArr } = useWorkflowVisStore()
  const [rawWorkflow, setRawWorkflow] = useState<IWorkflow>()
  const [workflow, setWorkflow] = useState<Partial<Workflow>>()
  const [currentStep, setCurrentStep] = useState(EImportStep.S0_UPLOAD_WORKFLOW)

  const { data: wfDetail } = trpc.workflow.detailed.useQuery(targetWfId!, {
    enabled: !!targetWfId,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  const handlePressCancel = useCallback(() => {
    setTargetWfId(null)
    setRawWorkflow(undefined)
    setWorkflow(undefined)
    updateHighlightArr([])
    setCurrentStep(EImportStep.S0_UPLOAD_WORKFLOW)
  }, [setTargetWfId, updateHighlightArr])

  const handlePressChangeRawWorkflow = useCallback(() => {
    setRawWorkflow(undefined)
    setCurrentStep(EImportStep.S0_UPLOAD_WORKFLOW)
  }, [])

  useEffect(() => {
    if (wfDetail) {
      setWorkflow(wfDetail)
      setRawWorkflow(JSON.parse(wfDetail.rawWorkflow))
      setCurrentStep(EImportStep.S1_WORKFLOW_INFO)
    }
  }, [wfDetail])

  useEffect(() => {
    if (!showDialog) {
      handlePressCancel()
    }
  }, [handlePressCancel, setTargetWfId, showDialog])

  return (
    <Dialog open={showDialog} modal onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setShowDialog(true)
          }}
          size='icon'
          className='rounded-full'
        >
          <PlusIcon width={16} height={16} />
        </Button>
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e) => {
          e.preventDefault()
        }}
        onInteractOutside={(e) => {
          e.preventDefault()
        }}
        className='max-w-full w-[calc(100vw-20px)] h-[calc(100vh-20px)] pt-4 bg-background flex flex-col [&>button]:hidden'
      >
        <DialogHeader className='flex-row items-center gap-2'>
          <DialogTitle className='text-base font-bold flex-auto'>
            {targetWfId ? 'UPDATE' : 'CREATE NEW'} WORKFLOW
          </DialogTitle>
          {currentStep !== EImportStep.S0_UPLOAD_WORKFLOW && (
            <Button
              onClick={handlePressChangeRawWorkflow}
              size='sm'
              title='Change raw workflow'
              variant='secondary'
              className='rounded-full !mt-0 flex gap-1 items-center'
            >
              <span>CHANGE RAW</span>
              <Replace width={16} height={16} />
            </Button>
          )}
          {currentStep !== EImportStep.S0_UPLOAD_WORKFLOW && (
            <Button
              onClick={handlePressCancel}
              size='sm'
              variant='destructive'
              className='rounded-full !mt-0 flex gap-1 items-center'
            >
              <span>CANCEL</span>
              <Trash width={16} height={16} />
            </Button>
          )}
          <Button onClick={() => setShowDialog(false)} size='icon' variant='secondary' className='rounded-full !mt-0'>
            <XIcon width={16} height={16} />
          </Button>
        </DialogHeader>
        <AddWorkflowDialogContext.Provider
          value={{
            currentStep,
            rawWorkflow,
            workflow,
            setWorkflow,
            setRawWorkflow,
            setDialog: setShowDialog,
            setStep: setCurrentStep
          }}
        >
          <div
            className={cn('w-full h-full flex items-center justify-center relative gap-2', {
              'border rounded-lg bg-secondary/20 shadow-inner': currentStep === EImportStep.S0_UPLOAD_WORKFLOW
            })}
          >
            {currentStep !== EImportStep.S0_UPLOAD_WORKFLOW && !!rawWorkflow && (
              <div className='w-3/4 hidden md:block h-full border rounded-lg bg-secondary/20 shadow-inner animate-in fade-in-10 overflow-hidden'>
                <WorkflowVisualize workflow={rawWorkflow} />
              </div>
            )}
            <SimpleTransitionLayout
              deps={[String(currentStep === EImportStep.S0_UPLOAD_WORKFLOW)]}
              className='flex flex-col min-w-[400px] w-full md:w-auto h-full flex-1 items-center'
            >
              {currentStep === EImportStep.S0_UPLOAD_WORKFLOW && <UploadWorkflow />}
              {currentStep !== EImportStep.S0_UPLOAD_WORKFLOW && <WorkflowConfiguration />}
            </SimpleTransitionLayout>
          </div>
        </AddWorkflowDialogContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
