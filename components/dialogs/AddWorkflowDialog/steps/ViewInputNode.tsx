import { LoadableButton } from '@/components/LoadableButton'
import { Button } from '@/components/ui/button'
import {
  PlusIcon,
  ChevronLeft,
  ArrowRight,
  InfoIcon,
  ChevronsLeftRight,
  DollarSign,
  CheckCheck,
  Variable,
  CornerDownRight
} from 'lucide-react'
import { AddWorkflowDialogContext, EImportStep } from '..'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useContext, useMemo } from 'react'
import { ArrowLongRightIcon } from '@heroicons/react/24/outline'
import { useKeygen } from '@/hooks/useKeygen'
import { cx } from 'class-variance-authority'

import * as Icons from '@heroicons/react/16/solid'
import { IMapperInput } from '@/entities/workflow'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/style'

export const ViewInputNode: IComponent<{
  readonly?: boolean
  onCreateNew?: () => void
  onEdit?: (inputConfig: IMapperInput) => void
}> = ({ readonly, onCreateNew, onEdit }) => {
  const { gen } = useKeygen()
  const { setStep, workflow, rawWorkflow } = useContext(AddWorkflowDialogContext)
  const mappedInput = workflow?.mapInput

  const renderMappedInput = useMemo(() => {
    const inputs = Object.entries(mappedInput || {})
    if (!inputs.length) {
      return (
        <Alert>
          <InfoIcon className='w-4 h-4' />
          <AlertTitle>Empty</AlertTitle>
          <AlertDescription>Please press add to create your first input</AlertDescription>
        </Alert>
      )
    }
    return inputs.map(([key, input]) => {
      const Icon = input.iconName ? Icons[input.iconName as keyof typeof Icons] : ChevronsLeftRight
      return (
        <Alert
          key={key}
          onClick={() => {
            if (!readonly) {
              onEdit?.(input)
            }
          }}
          className={cn('hover:opacity-70 transition-all', {
            'cursor-pointer': !readonly
          })}
        >
          <Icon className='w-4 h-4' />
          <AlertTitle>
            <div
              className={cx('gap-2 flex whitespace-nowrap flex-wrap', {
                'flex-col': input.target.length > 1,
                'flex-row': input.target.length === 1
              })}
            >
              <span>{input.key}</span>
              {input.target.length === 1 &&
                input.target.map((target) => {
                  const node = rawWorkflow?.[target.nodeName]
                  return (
                    <div key={gen(target)} className='flex items-center gap-2'>
                      <ArrowLongRightIcon width={16} height={16} />
                      <span>{node?.info?.displayName || node?.info?.name || node?.class_type || target.nodeName}</span>
                      <ArrowLongRightIcon width={16} height={16} />
                      <span>{target.keyName}</span>
                    </div>
                  )
                })}
            </div>
          </AlertTitle>
          <AlertDescription className='flex flex-col'>
            <p>{input.description?.trim() || 'No description'}</p>
            <div className='flex gap-1 flex-wrap'>
              <Badge variant='secondary' className='mt-2'>
                <Variable width={14} height={14} className='mr-1' />
                {input.type}
              </Badge>
              {!!input.selections?.length && (
                <Badge variant='secondary' className='mt-2'>
                  <CheckCheck width={14} height={14} className='mr-1' />
                  Selections {input.selections.length}
                </Badge>
              )}
              {!!input.cost?.related && (
                <Badge variant='secondary' className='mt-2'>
                  <DollarSign width={14} height={14} className='mr-1' />
                  Cost related
                </Badge>
              )}
            </div>
            {input.target.length > 1 && (
              <>
                <p className='text-xs font-bold mt-2'>MULTIPLE CONNECTIONS</p>
                {input.target.map((target) => {
                  const node = rawWorkflow?.[target.nodeName]
                  return (
                    <div key={gen(target)} className='flex items-center gap-2'>
                      <CornerDownRight width={16} height={16} />
                      <span>{node?.info?.displayName || node?.info?.name || node?.class_type || target.nodeName}</span>
                      <ArrowLongRightIcon width={16} height={16} />
                      <span>{target.keyName}</span>
                    </div>
                  )
                })}
              </>
            )}
          </AlertDescription>
        </Alert>
      )
    })
  }, [gen, mappedInput, onEdit, rawWorkflow, readonly])

  return (
    <>
      <h1
        className={cn('font-semibold', {
          'text-sm': readonly
        })}
      >
        MAP INPUT NODE
      </h1>
      <div className='space-y-4 min-w-80 pt-2'>
        {renderMappedInput}
        {!readonly && (
          <>
            <Button onClick={onCreateNew} className='w-full' variant='outline'>
              Add more input <PlusIcon className='w-4 h-4 ml-2' />
            </Button>
            <div className='flex gap-2 w-full justify-end items-center mt-4'>
              <Button onClick={() => setStep?.(EImportStep.S1_WORKFLOW_INFO)} variant='secondary' className=''>
                Back
                <ChevronLeft width={16} height={16} className='ml-2' />
              </Button>
              <LoadableButton onClick={() => setStep?.(EImportStep.S3_MAPPING_OUTPUT)}>
                Continue
                <ArrowRight width={16} height={16} className='ml-2' />
              </LoadableButton>
            </div>
          </>
        )}
      </div>
    </>
  )
}
