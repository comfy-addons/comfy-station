import { useContext, useMemo } from 'react'
import { AddWorkflowDialogContext, EImportStep } from '.'
import { cn } from '@/utils/style'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { WorkflowInformation } from './steps/WorkflowInformation'
import { MappingInput } from './steps/MappingInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MappingOutput } from './steps/MappingOutput'
import { FinalizeStep } from './steps/Finalize'

export const WorkflowConfiguration: IComponent = () => {
  const { currentStep, setStep } = useContext(AddWorkflowDialogContext)
  const renderSteps = useMemo(() => {
    return Array.from({ length: 4 }).map((_, index) => {
      return (
        <div
          key={index}
          onClick={() => setStep?.(index + 1)}
          className={cn(
            'transition-all duration-500 group-hover:scale-90 hover:!scale-105 cursor-pointer active:!scale-75',
            {
              'text-foreground': index === currentStep - 1,
              'text-border': index !== currentStep - 1
            }
          )}
        >
          STEP {index + 1}
        </div>
      )
    })
  }, [currentStep, setStep])

  return (
    <div className='w-full h-full border rounded-lg bg-secondary/20 shadow-inner'>
      <div className='w-full flex flex-col h-full'>
        <div className='flex gap-1 text-sm font-medium px-2 pt-2 group'>{renderSteps}</div>
        <SimpleTransitionLayout deps={[currentStep]} className='w-full h-full relative'>
          <div className='absolute top-0 left-0 w-full h-full'>
            <ScrollArea className='w-full h-full'>
              <div className='min-h-full w-full px-2 pb-2'>
                {currentStep === EImportStep.S1_WORKFLOW_INFO && <WorkflowInformation />}
                {currentStep === EImportStep.S2_MAPPING_INPUT && <MappingInput />}
                {currentStep === EImportStep.S3_MAPPING_OUTPUT && <MappingOutput />}
                {currentStep === EImportStep.S4_FINALIZE && <FinalizeStep />}
              </div>
            </ScrollArea>
          </div>
        </SimpleTransitionLayout>
      </div>
    </div>
  )
}
