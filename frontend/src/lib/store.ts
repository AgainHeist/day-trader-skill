import { create } from 'zustand'

interface AppState {
  symbol: string
  setSymbol: (s: string) => void
  paperMode: boolean
  user: any
  setUser: (u: any) => void
  isAuthenticated: boolean
  setAuthenticated: (v: boolean) => void
  connectionStatus: 'Connected' | 'Reconnecting' | 'Offline'
  setConnectionStatus: (s: any) => void
  notifications: any[]
  addNotification: (n: any) => void
}

export const useStore = create<AppState>((set) => ({
  symbol: 'TSLA',
  setSymbol: (s) => set({ symbol: s }),
  paperMode: true,
  user: null,
  setUser: (u) => set({ user: u, isAuthenticated: !!u }),
  isAuthenticated: !!localStorage.getItem('token'),
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  connectionStatus: 'Reconnecting',
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  notifications: [],
  addNotification: (n) => set((state) => ({ notifications: [...state.notifications.slice(-20), { ...n, id: Date.now() }] })),
}))
