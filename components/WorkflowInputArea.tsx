import { Workflow } from '@/entities/workflow'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { EValueSelectionType, EValueType, EValueUtilityType } from '@/entities/enum'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select'
import DropFileInput from './DropFileInput'
import { CardDescription } from './ui/card'
import { Input } from './ui/input'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { IconPicker } from './IconPicker'
import { OverflowText } from './OverflowText'
import { Button } from './ui/button'
import { ChevronLeft, Dice5, Repeat } from 'lucide-react'
import { seed } from '@/utils/tools'
import { useWorkflowVisStore } from './WorkflowVisualize/state'
import { Switch } from './ui/switch'
import { useWorkflowStore } from '@/states/workflow'
import { useGenerative } from '@/hooks/useGenerative'
import { GenerativeTextarea } from './GenerativeTextarea'
import { useIsolateState } from '@/hooks/useIsolateState'

const SelectionSchema = z.nativeEnum(EValueSelectionType)

export const WorkflowInputArea: IComponent<{
  workflow: Partial<Workflow>
  disabled?: boolean
  repeat?: number
  randomSeedEnabled?: boolean
  changeRandomSeedEnabled?: (enabled: boolean) => void
  onChangeRepeat?: (repeat: number) => void
  data: Record<string, any>
  onChange?: (data: Record<string, any>) => void
}> = ({ data, workflow, disabled, repeat, onChangeRepeat, onChange, randomSeedEnabled, changeRandomSeedEnabled }) => {
  const { isActive, prompter } = useGenerative()
  const { updateSelecting, recenter } = useWorkflowVisStore()
  const { setCurrentInput } = useWorkflowStore()
  const inputData = data

  const setInputStateIsolate = useIsolateState((state) => {
    setInputData((prev) => ({ ...prev, ...state }))
  })

  const setInputData = useCallback(
    (input: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
      if (typeof input === 'function') {
        onChange?.(input(inputData))
      } else {
        onChange?.(input)
      }
    },
    [inputData, onChange]
  )

  const inputKeys: Array<keyof typeof workflow.mapInput> = useMemo(() => {
    return Object.keys(workflow?.mapInput || {}) as any
  }, [workflow?.mapInput])

  useEffect(() => {
    setCurrentInput(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleUpdateInput = useRef((key: keyof typeof workflow.mapInput, val: any) => {
    setInputStateIsolate({ [key]: val })
  })

  const renderInput = useCallback(
    (val: keyof typeof workflow.mapInput, data: any) => {
      const input = workflow?.mapInput?.[val]
      const target = input?.target || []
      const mainItem = target[0]
      if (!input) return null
      if (input.type === EValueUtilityType.Prefixer) return null

      return (
        <div
          key={val}
          onFocus={() => {
            if (mainItem) {
              updateSelecting(mainItem.mapVal.split('.')[0])
            }
          }}
          onBlur={() => {
            updateSelecting()
          }}
          className='w-full px-2 flex flex-col gap-2 mb-2'
        >
          <div className='flex items-center gap-1'>
            <IconPicker readonly value={input.iconName} />
            <Label>{input.key}</Label>
          </div>
          {!!input.description && <CardDescription>{input.description}</CardDescription>}
          {input.type === EValueType.String && (
            <GenerativeTextarea
              disabled={disabled}
              className='min-h-[240px] max-w-full'
              onChange={(e) => {
                handleUpdateInput.current(val, e.target.value)
              }}
              value={data}
              generative={!!input.generative?.enabled}
              instruction={input.generative?.instruction}
              placeholder={String(input.default ?? '')}
            />
          )}
          {[EValueType.File, EValueType.Image].includes(input.type as EValueType) && (
            <DropFileInput
              disabled={disabled}
              onChanges={(files) => {
                handleUpdateInput.current(val, files)
              }}
              defaultFiles={data}
            />
          )}
          {[EValueType.Number, EValueUtilityType.Seed].includes(input.type as EValueType) && (
            <>
              <div className='w-full gap-2 flex'>
                <Input
                  startAdornment={
                    input.type === EValueType.Number ? (
                      <div className='flex items-center gap-2'>
                        {input.min} <ChevronLeft size={16} />
                      </div>
                    ) : undefined
                  }
                  endAdornment={
                    input.type === EValueType.Number ? (
                      <div className='flex items-center gap-2'>
                        <ChevronLeft size={16} /> {input.max}
                      </div>
                    ) : undefined
                  }
                  adornmentCls='text-sm pt-[1px]'
                  disabled={disabled}
                  placeholder={String(input.default ?? '')}
                  value={data}
                  onChange={(e) => {
                    handleUpdateInput.current(val, e.target.value)
                  }}
                  min={input.min}
                  max={input.max}
                  type='number'
                />
                {input.type === EValueUtilityType.Seed && (
                  <Button
                    onClick={() => {
                      handleUpdateInput.current(val, seed())
                    }}
                    variant='outline'
                    size='icon'
                  >
                    <Dice5 className='w-4 h-4' />
                  </Button>
                )}
              </div>
              {input.type === EValueUtilityType.Seed && (
                <div className='flex items-center space-x-2 w-full'>
                  <Switch checked={randomSeedEnabled} onCheckedChange={changeRandomSeedEnabled} />
                  <Label htmlFor='airplane-mode'>Random seed after run</Label>
                </div>
              )}
            </>
          )}
          {SelectionSchema.safeParse(input.type).success && (
            <Select
              defaultValue={String(input.default ?? '')}
              value={data}
              onValueChange={(value) => {
                handleUpdateInput.current(val, value)
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
        </div>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, updateSelecting, handleUpdateInput, workflow, isActive, prompter.isPending]
  )

  useEffect(() => {
    if (workflow.mapInput) {
      const seedInputKey = Object.keys(workflow.mapInput).find(
        (key) => workflow.mapInput?.[key].type === EValueUtilityType.Seed
      )

      if (seedInputKey && !inputData[seedInputKey]) {
        setInputData((prev) => ({ ...prev, [seedInputKey]: seed() }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.mapInput])

  return (
    <div className='absolute top-0 left-0 w-full h-full flex flex-col'>
      <div
        className='mt-2 border-t w-full h-full relative overflow-auto pt-2 shadow-inner'
        onBlur={() => {
          recenter?.()
        }}
      >
        {inputKeys.map((v) => renderInput(v, inputData[v]))}
        {!!onChangeRepeat && (
          <div className='w-full px-2 flex flex-col gap-2 mb-2'>
            <div className='flex items-center gap-1'>
              <Repeat className='w-4 h-4' />
              <Label>Repeat</Label>
            </div>
            <CardDescription>Repeat this job many times by creating sub jobs</CardDescription>
            <div className='w-full gap-2 flex'>
              <Input
                disabled={disabled}
                value={repeat}
                min={1}
                step={1}
                onChange={(e) => {
                  onChangeRepeat?.(Number(e.target.value))
                }}
                type='number'
              />
            </div>
          </div>
        )}
        <div className='flex flex-col border-t py-2 px-2'>
          <div>
            <Label>Description</Label>
            <OverflowText className='text-sm w-full line-clamp-3 text-start'>{workflow?.description}</OverflowText>
          </div>
          <div>
            <Label>Base cost per run</Label>
            <p className='text-sm'>{workflow?.cost} Credits</p>
          </div>
          <div>
            <Label>Author</Label>
            <p className='text-sm'>@{workflow?.author?.email.split('@')[0]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
