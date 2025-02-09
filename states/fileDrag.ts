import { cloneDeep } from 'lodash'
import { create } from 'zustand'

/**
 * Allow file or attachment-id
 */
export type IInputFileType = File | string

interface FileDragState {
  dragIds: string[]
  draggingFile: IInputFileType | null
  reqFiles: Map<string, IInputFileType[]>
  addReqFiles: (id: string, files: IInputFileType[]) => void
  removeReqFiles: (id: string) => void
  addDragId: (id: string) => void
  removeDragId: (id: string) => void
  setDraggingFile: (file: IInputFileType | null) => void
}

export const useFileDragStore = create<FileDragState>((set) => ({
  draggingFile: null,
  dragIds: [],
  reqFiles: new Map(),
  addReqFiles: (id, files) => {
    set((state) => {
      state.reqFiles.set(id, files)
      return { reqFiles: cloneDeep(state.reqFiles) }
    })
  },
  removeReqFiles: (id) =>
    set((state) => {
      state.reqFiles.delete(id)
      return { reqFiles: cloneDeep(state.reqFiles) }
    }),
  addDragId: (id) => set((state) => ({ dragIds: [...state.dragIds, id] })),
  removeDragId: (id) => set((state) => ({ dragIds: state.dragIds.filter((v) => v !== id) })),
  setDraggingFile: (file) => set({ draggingFile: file })
}))
