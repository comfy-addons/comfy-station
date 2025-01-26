import { create } from 'zustand'

export enum EHighlightType {
  INPUT,
  OUTPUT,
  SELECTING,
  NONE
}

interface IWorkflowVisState {
  recenter?: () => void
  setRecenterFn: (fn: () => void) => void
  highlightArr: { id: string; type: EHighlightType; processing?: boolean }[]
  updateHighlightArr: (arr: { id: string; type: EHighlightType; processing?: boolean }[]) => void
  clearSelecting: () => void
  updateProcessing: (id?: string) => void
  updateSelecting: (id?: string) => void
}

export const useWorkflowVisStore = create<IWorkflowVisState, any>((set, get) => ({
  highlightArr: [],
  setRecenterFn: (fn) => set({ recenter: fn }),
  updateSelecting: (id) => {
    if (!id) {
      if (get().highlightArr.some((item) => item.type === EHighlightType.SELECTING)) {
        set({ highlightArr: get().highlightArr.filter((item) => item.type !== EHighlightType.SELECTING) })
      }
    } else {
      if (get().highlightArr.some((item) => item.type === EHighlightType.SELECTING)) {
        set({
          highlightArr: get().highlightArr.map((item) =>
            item.type === EHighlightType.SELECTING ? { ...item, id } : item
          )
        })
      } else {
        set({ highlightArr: [...get().highlightArr, { id, type: EHighlightType.SELECTING }] })
      }
    }
  },
  updateHighlightArr: (arr) => set({ highlightArr: arr }),
  clearSelecting: () =>
    set({ highlightArr: get().highlightArr.filter((item) => item.type !== EHighlightType.SELECTING) }),
  updateProcessing: (id) => {
    const haveProcessing = get().highlightArr.some((item) => item.processing)
    const clean = get().highlightArr.filter((item) => !item.processing)
    if (!id) {
      if (!haveProcessing) return
      set({ highlightArr: clean })
    } else {
      const found = get().highlightArr.find((item) => item.id === id)
      if (found?.processing) return
      if (!found) {
        set({ highlightArr: [...clean, { id, type: EHighlightType.NONE, processing: true }] })
      } else {
        set({
          highlightArr: get().highlightArr.map((item) => (item.id === id ? { ...item, processing: true } : item))
        })
      }
    }
  }
}))
