'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from '@/components/ui/command'
import { useShortcutKeyEvent, ESpecialKey, EKeyboardKey } from '@/hooks/useShortcutKeyEvent'
import { useWorkflowStore } from '@/states/workflow'
import { trpc } from '@/utils/trpc'
import { useRouter } from '@/i18n/routing'
import { AttachmentImage } from './AttachmentImage'
import { search as searchFz } from 'fast-fuzzy'

export function FastSwitch() {
  const [search, setSearch] = useState('')
  const router = useRouter()
  const workflowLister = trpc.workflow.listPicking.useQuery()
  const { fastSwitchOpen, setFastSwitchOpen } = useWorkflowStore()

  // Show dialog on Ctrl+K
  useShortcutKeyEvent(
    EKeyboardKey.K,
    () => {
      setFastSwitchOpen(true)
      workflowLister.refetch()
    },
    ESpecialKey.Ctrl
  )

  // Filter workflows based on search
  const filteredWorkflows = React.useMemo(() => {
    return search.length
      ? searchFz(search, workflowLister.data ?? [], {
          keySelector: (workflow) => workflow.name ?? ''
        })
      : workflowLister.data
  }, [search, workflowLister.data])

  const handleSwitchWorkflow = React.useCallback(
    (workflowId: string) => {
      router.push(`/main/workflow/${workflowId}`)
      setFastSwitchOpen(false)
    },
    [router, setFastSwitchOpen]
  )

  // Handle number shortcuts (Ctrl+1 to Ctrl+5)
  useEffect(() => {
    if (!fastSwitchOpen) return

    const numberKeys = [EKeyboardKey.One, EKeyboardKey.Two, EKeyboardKey.Three, EKeyboardKey.Four, EKeyboardKey.Five]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return

      // Find matching number key
      const keyIndex = numberKeys.findIndex((key) => e.key === key)
      if (keyIndex !== -1) {
        e.preventDefault()
        const workflow = filteredWorkflows?.[keyIndex]
        if (workflow) {
          handleSwitchWorkflow(workflow.id)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [fastSwitchOpen, filteredWorkflows, handleSwitchWorkflow])

  return (
    <CommandDialog open={fastSwitchOpen} onOpenChange={setFastSwitchOpen} shouldFilter={false}>
      <CommandInput placeholder='Search workflows...' value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No workflows found.</CommandEmpty>
        {filteredWorkflows?.map((workflow, index) => (
          <CommandItem
            key={workflow.id}
            onSelect={() => handleSwitchWorkflow(workflow.id)}
            className='flex flex-row items-center gap-2'
          >
            <div className='h-12 w-12'>
              <AttachmentImage alt={workflow.name ?? 'preview'} data={workflow.avatar} className='rounded' />
            </div>
            <div className='flex flex-col'>
              <span>{workflow.name}</span>
              {!!workflow.description && <span className='text-xs text-foreground/50'>{workflow.description}</span>}
            </div>
            {index < 5 && (
              <CommandShortcut>
                <kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
                  ^{index + 1}
                </kbd>
              </CommandShortcut>
            )}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
