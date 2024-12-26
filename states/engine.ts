import { create } from 'zustand'

interface IState {
  scrolling: boolean
  setScrolling: (scrolling: boolean) => void
}
export const useEngineStore = create<IState>((set, get) => ({
  scrolling: false,
  setScrolling: (scrolling) => set({ scrolling })
}))
