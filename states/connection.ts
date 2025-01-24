import { create } from 'zustand'

interface IState {
  wsConnected: boolean
  setWsConnected: (wsConnected: boolean) => void
}
export const useConnectionStore = create<IState>((set, get) => ({
  wsConnected: false,
  setWsConnected: (wsConnected) => set({ wsConnected })
}))
