import { create } from 'zustand'

interface IWorkflowState {
  targetWfId: string | null
  showDialog: boolean
  currentInput: Record<string, any>
  fastSwitchOpen: boolean
  setTargetWfId: (id: string | null) => void
  setShowDialog: (show: boolean) => void
  setCurrentInput: (input: Record<string, any>) => void

  setFastSwitchOpen: (open: boolean) => void
}

export const useWorkflowStore = create<IWorkflowState>((set, get) => ({
  targetWfId: null,
  showDialog: false,
  currentInput: {},
  fastSwitchOpen: false,
  setTargetWfId: (id) => set({ targetWfId: id }),
  setShowDialog: (show) => set({ showDialog: show }),
  setCurrentInput: (input) => set({ currentInput: input }),
  setFastSwitchOpen: (open) => set({ fastSwitchOpen: open })
}))
