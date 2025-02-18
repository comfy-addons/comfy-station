# FastSwitch Component Implementation Plan

## Overview
Create a command palette style popup for quick workflow switching, accessible via Ctrl+K with number shortcuts for quick selection.

## Component Structure

### FastSwitch.tsx
```typescript
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandShortcut } from './ui/command'
import { useShortcutKeyEvent } from '@/hooks/useShortcutKeyEvent'
import { useWorkflowStore } from '@/states/workflow'

export function FastSwitch() {
  // State management
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const workflows = useWorkflowStore(state => state.workflows)
  const switchWorkflow = useWorkflowStore(state => state.switchWorkflow)

  // Keyboard shortcuts
  useShortcutKeyEvent('k', () => setOpen(true), 'Control')
  
  // Quick select shortcuts (Ctrl+1 to Ctrl+5)
  useEffect(() => {
    if (!open) return
    // Handle number shortcuts
  }, [open, workflows])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search workflows..." />
      <CommandList>
        {workflows.map((workflow, index) => (
          <CommandItem
            key={workflow.id}
            onSelect={() => {
              switchWorkflow(workflow.id)
              setOpen(false)
            }}
          >
            {workflow.title}
            {index < 5 && (
              <CommandShortcut>⌃{index + 1}</CommandShortcut>
            )}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
```

## State Updates Required

Add to workflow state (states/workflow.ts):
```typescript
interface IWorkflowState {
  // ... existing state
  workflows: Array<{
    id: string
    title: string
    // other workflow metadata
  }>
  switchWorkflow: (id: string) => void
}
```

## Implementation Steps

1. Update Workflow State
   - Add workflows array to state
   - Add switchWorkflow action

2. Create FastSwitch Component
   - Implement core UI with CommandDialog
   - Add search functionality
   - Add keyboard shortcuts

3. Add to Layout
   - Mount FastSwitch at the app root level
   - Ensure it's available globally

4. Test Cases
   - Verify Ctrl+K shows dialog
   - Verify search filters workflows
   - Verify Ctrl+1-5 shortcuts work
   - Verify Esc and click-outside dismiss
   - Verify workflow switching works correctly

## Technical Considerations

- Use debouncing for search input
- Ensure keyboard shortcuts don't conflict
- Handle empty states gracefully
- Consider loading states for workflow data
- Add error boundaries