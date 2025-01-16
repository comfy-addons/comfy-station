import { LoadableButton } from '@/components/LoadableButton'
import { Button } from '@/components/ui/button'
import { PlusIcon, ChevronLeft, ArrowRight, InfoIcon, ChevronsLeftRight, Variable } from 'lucide-react'
import { AddWorkflowDialogContext, EImportStep } from '..'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useContext, useMemo } from 'react'
import { ArrowLongLeftIcon } from '@heroicons/react/24/outline'
import { cx } from 'class-variance-authority'

import * as Icons from '@heroicons/react/16/solid'
import { IMapperOutput } from '@/entities/workflow'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/style'

export const ViewOutputNode: IComponent<{
  readonly?: boolean
  onCreateNew?: () => void
  onEdit?: (outputConfig: IMapperOutput) => void
}> = ({ readonly, onCreateNew, onEdit }) => {
  const { setStep, workflow, rawWorkflow } = useContext(AddWorkflowDialogContext)
  const mappedOutput = workflow?.mapOutput

  const renderMappedOutput = useMemo(() => {
    const outputs = Object.entries(mappedOutput || {})
    if (!outputs.length) {
      return (
        <Alert>
          <InfoIcon className='w-4 h-4' />
          <AlertTitle>Empty</AlertTitle>
          <AlertDescription>Please press add to create your first output</AlertDescription>
        </Alert>
      )
    }
    return outputs.map(([key, output]) => {
      const Icon = output.iconName ? Icons[output.iconName as keyof typeof Icons] : ChevronsLeftRight
      const target = output.target
      const node = rawWorkflow?.[target.nodeName]
      return (
        <Alert
          key={key}
          onClick={() => {
            if (!readonly) {
              onEdit?.(output)
            }
          }}
          className={cn('hover:opacity-70 transition-all', {
            'cursor-pointer': !readonly
          })}
        >
          <Icon className='w-4 h-4' />
          <AlertTitle>
            <div className={cx('gap-2 flex whitespace-nowrap flex-wrap flex-row')}>
              <span>{output.key}</span>
              <div className='flex items-center gap-2'>
                {!!target.keyName.length && (
                  <>
                    <ArrowLongLeftIcon width={16} height={16} />
                    <span>{target.keyName}</span>
                  </>
                )}
                <ArrowLongLeftIcon width={16} height={16} />
                <span>{node?.info?.displayName || node?.info?.name || node?.class_type || target.nodeName}</span>
              </div>
            </div>
          </AlertTitle>
          <AlertDescription className='flex flex-col'>
            <p>{output.description?.trim() || 'No description'}</p>
            <div className='flex gap-1 flex-wrap'>
              <Badge variant='secondary' className='mt-2'>
                <Variable width={14} height={14} className='mr-1' />
                {output.type}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )
    })
  }, [mappedOutput, onEdit, rawWorkflow, readonly])

  return (
    <>
      <h1
        className={cn('font-semibold', {
          'text-sm': readonly
        })}
      >
        MAP OUTPUT NODE
      </h1>
      <div className='space-y-4 min-w-80 pt-2'>
        {renderMappedOutput}
        {!readonly && (
          <>
            <Button onClick={onCreateNew} className='w-full' variant='outline'>
              Add more output <PlusIcon className='w-4 h-4 ml-2' />
            </Button>
            <div className='flex gap-2 w-full justify-end items-center mt-4'>
              <Button onClick={() => setStep?.(EImportStep.S2_MAPPING_INPUT)} variant='secondary' className=''>
                Back
                <ChevronLeft width={16} height={16} className='ml-2' />
              </Button>
              <LoadableButton onClick={() => setStep?.(EImportStep.S4_FINALIZE)}>
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
