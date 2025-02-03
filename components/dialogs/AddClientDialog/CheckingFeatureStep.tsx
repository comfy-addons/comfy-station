import { useContext } from 'react'
import { AddClientDialogContext, EImportStep } from '.'
import { SimpleInfoItem } from '@/components/SimpleInfoItem'
import { ArrowTopRightOnSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { LoadableButton } from '@/components/LoadableButton'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl' // Import the translation hook

export const CheckingFeatureStep: IComponent = () => {
  const { clientInfo, setStep } = useContext(AddClientDialogContext)
  const t = useTranslations('components.checkingFeatureStep') // Initialize the translation hook

  const handleContinue = async () => {
    setStep?.(EImportStep.INFORMATION_CHECKING)
  }

  return (
    <>
      <div className='flex flex-col gap-2 max-w-sm w-full'>
        <SimpleInfoItem
          Icon={CheckIcon}
          title={t('serverConnected')}
          className='h-14'
          iconCls='text-green-500'
          suffix={<span>{clientInfo?.result.ping.toFixed(1)}ms</span>}
        />
        <SimpleInfoItem
          Icon={clientInfo?.result.feature.manager ? CheckIcon : XMarkIcon}
          title={
            clientInfo?.result.feature.manager ? t('managerInstalled') : t('managerNotInstalled')
          }
          className='h-14'
          iconCls='text-green-500'
          suffix={
            <Button
              onClick={() => window.open('https://github.com/ltdrdata/ComfyUI-Manager', '_blank')}
              size='icon'
              variant='outline'
              className=''
            >
              <ArrowTopRightOnSquareIcon width={16} height={16} />
            </Button>
          }
        />
        <SimpleInfoItem
          Icon={clientInfo?.result.feature.monitor ? CheckIcon : XMarkIcon}
          title={
            clientInfo?.result.feature.monitor
              ? t('crystoolInstalled')
              : t('crystoolNotInstalled')
          }
          iconCls='text-green-500'
          className='h-14'
          suffix={
            <Button
              onClick={() => window.open('https://github.com/crystian/ComfyUI-Crystools', '_blank')}
              size='icon'
              variant='outline'
              className=''
            >
              <ArrowTopRightOnSquareIcon width={16} height={16} />
            </Button>
          }
        />
      </div>
      <div className='flex gap-2 w-full justify-center mt-4'>
        <Button onClick={() => setStep?.(EImportStep.INPUT_CLIENT_INFO)} variant='secondary' className=''>
          {t('back')}
          <ChevronLeft width={16} height={16} className='ml-2' />
        </Button>
        <LoadableButton onClick={handleContinue}>
          {t('continue')}
          <ArrowRight width={16} height={16} className='ml-2' />
        </LoadableButton>
      </div>
      <div className='flex flex-col gap-2 w-full justify-center mt-4'>
        <p className='text-sm font-normal text-zinc-400 max-w-lg text-center'>
          {t('crystoolInfo')}
        </p>
        <p className='text-sm font-normal text-zinc-400 max-w-lg text-center'>
          {t('managerInfo')}
        </p>
      </div>
    </>
  )
}
