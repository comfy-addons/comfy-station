import { create } from 'zustand'

interface FileDragState {
  draggingFile: File | null
  setDraggingFile: (file: File | null) => void
}

export const useFileDragStore = create<FileDragState>((set) => ({
  draggingFile: null,
  setDraggingFile: (file) => set({ draggingFile: file })
}))
