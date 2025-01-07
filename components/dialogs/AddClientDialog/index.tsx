import { PlusIcon } from '@radix-ui/react-icons'
import { Button } from '../../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog'
import { InputClientInfoStep } from './InputClientInfoStep'
import { createContext, useState } from 'react'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { CheckingFeatureStep } from './CheckingFeatureStep'
import { InformationCheckingStep } from './InformationCheckingStep'
import { cn } from '@/lib/utils'
import { ImportClientStep } from './ImportClientStep'

export enum EImportStep {
  'INPUT_CLIENT_INFO',
  'FEATURE_CHECKING',
  'INFORMATION_CHECKING',
  'IMPORTING'
}

interface IAddClientContext {
  show?: boolean
  currentStep: EImportStep
  clientInfo?: {
    host: string
    auth: boolean
    username?: string
    password?: string
    displayName?: string
    result: {
      ping: number
      feature: {
        manager: boolean
        monitor: boolean
      }
    }
  }
  setDialog?: (show: boolean) => void
  setStep?: (step: EImportStep) => void
  setDisplayName?: (name: string) => void
  setClientInfo?: (info: IAddClientContext['clientInfo']) => void
}

export const AddClientDialogContext = createContext<IAddClientContext>({
  currentStep: EImportStep.INPUT_CLIENT_INFO
})

export const AddClientDialog: IComponent = () => {
  const [show, setShow] = useState(false)
  const [currentStep, setCurrentStep] = useState(EImportStep.INPUT_CLIENT_INFO)
  const [clientInfo, setClientInfo] = useState<IAddClientContext['clientInfo']>()

  const handleSetDisplayName = (name: string) => {
    setClientInfo((prev) => {
      return { ...prev!, displayName: name }
    })
  }
  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogTrigger asChild className='ml-auto'>
        <Button
          onClick={() => {
            setShow(true)
          }}
          className='hidden md:flex'
          size='icon'
          variant='ghost'
        >
          <PlusIcon width={16} height={16} />
        </Button>
      </DialogTrigger>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault()
        }}
        className='max-w-full w-[calc(100vw-20px)] h-[calc(100vh-20px)] bg-background flex flex-col'
      >
        <DialogHeader>
          <DialogTitle className='text-base font-bold'>ADD NEW WORKER NODE</DialogTitle>
        </DialogHeader>
        <AddClientDialogContext.Provider
          value={{
            currentStep,
            clientInfo,
            setClientInfo,
            setDialog: setShow,
            setStep: setCurrentStep,
            setDisplayName: handleSetDisplayName
          }}
        >
          <div
            className={cn('w-full h-full flex items-center justify-center relative', {
              'border rounded-lg bg-secondary/20 shadow-inner': currentStep !== EImportStep.INFORMATION_CHECKING
            })}
          >
            <SimpleTransitionLayout deps={[currentStep]} className='flex flex-col items-center'>
              {currentStep === EImportStep.INPUT_CLIENT_INFO && <InputClientInfoStep />}
              {currentStep === EImportStep.FEATURE_CHECKING && <CheckingFeatureStep />}
              {currentStep === EImportStep.INFORMATION_CHECKING && <InformationCheckingStep />}
              {currentStep === EImportStep.IMPORTING && <ImportClientStep />}
            </SimpleTransitionLayout>
          </div>
        </AddClientDialogContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
