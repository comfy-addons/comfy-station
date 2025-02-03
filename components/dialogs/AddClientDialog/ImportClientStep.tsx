import { useContext, useState } from 'react'
import { AddClientDialogContext, EImportStep } from '.'
import { SimpleInfoItem } from '@/components/SimpleInfoItem'
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { LoadableButton } from '@/components/LoadableButton'
import { EImportingClient } from '@/constants/enum'
import { trpc } from '@/utils/trpc'
import { LoadingSVG } from '@/components/svg/LoadingSVG'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'
import { useTranslations } from 'next-intl' // Import the translation hook

export const ImportClientStep: IComponent = () => {
  const [importStatuses, setImportStatuses] = useState<EImportingClient[]>([])
  const { clientInfo, setStep, setDialog } = useContext(AddClientDialogContext)
  const t = useTranslations('components.importClientStep') // Initialize the translation hook

  trpc.client.addNewClient.useSubscription(
    {
      host: clientInfo!.host,
      auth: clientInfo!.auth,
      username: clientInfo?.username,
      password: clientInfo?.password,
      displayName: clientInfo?.displayName
    },
    {
      onData: (data) => setImportStatuses((prev) => [...prev, data])
    }
  )

  const isFailed = importStatuses.includes(EImportingClient.FAILED)
  const isDone = importStatuses.includes(EImportingClient.DONE)

  const renderStatus = (type: EImportingClient, title: string) => {
    const isChecked = importStatuses.includes(type)
    const Icon = isChecked ? CheckIcon : (LoadingSVG as any)
    return (
      <SimpleInfoItem
        Icon={isFailed ? XMarkIcon : Icon}
        title={title}
        className='h-14'
        iconCls={!isChecked ? '' : 'text-green-500'}
      />
    )
  }

  const handleFinish = () => {
    dispatchGlobalEvent(EGlobalEvent.RLOAD_CLIENTS)
    setStep?.(EImportStep.INPUT_CLIENT_INFO)
    setDialog?.(false)
  }

  return (
    <>
      <div className='flex flex-col gap-2 max-w-sm w-full'>
        {renderStatus(EImportingClient.PING_OK, t('pingServer'))}
        {renderStatus(EImportingClient.CLIENT_CREATED, t('createClient'))}
        {renderStatus(EImportingClient.IMPORTED_CHECKPOINT, t('importedCheckpoint'))}
        {renderStatus(EImportingClient.IMPORTED_LORA, t('importedLora'))}
        {renderStatus(EImportingClient.IMPORTED_SAMPLER_SCHEDULER, t('importedSamplerScheduler'))}
        {renderStatus(EImportingClient.IMPORTED_EXTENSION, t('importedExtension'))}
      </div>
      <div className='flex gap-2 w-full justify-center mt-4'>
        <Button
          disabled={!isDone && !isFailed}
          onClick={() => setStep?.(EImportStep.INFORMATION_CHECKING)}
          variant='secondary'
          className=''
        >
          {t('back')}
          <ChevronLeftIcon width={16} height={16} className='ml-2' />
        </Button>
        <LoadableButton disabled={!isDone || isFailed} loading={!isDone && !isFailed} onClick={handleFinish}>
          {t('finish')}
          <ArrowRightIcon width={16} height={16} className='ml-2' />
        </LoadableButton>
      </div>
      <div className='flex flex-col gap-2 w-full justify-center mt-4'>
        <p className='text-sm font-normal text-zinc-400 max-w-lg text-center'>
          {t('waitMessage')}
        </p>
      </div>
    </>
  )
}
