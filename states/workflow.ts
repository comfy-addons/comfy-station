import { create } from 'zustand'

interface IWorkflowState {
  targetWfId: string | null
  showDialog: boolean
  setShowDialog: (show: boolean) => void
  currentInput: Record<string, any>
  setTargetWfId: (id: string | null) => void
  setCurrentInput: (input: Record<string, any>) => void
}

export const useWorkflowStore = create<IWorkflowState, any>((set, get) => ({
  targetWfId: null,
  showDialog: false,
  currentInput: {},
  setTargetWfId: (id) => set({ targetWfId: id }),
  setShowDialog: (show) => set({ showDialog: show }),
  setCurrentInput: (input) => set({ currentInput: input })
}))
