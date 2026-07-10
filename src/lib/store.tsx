import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppState, CheckInRecord, ChatMessage, FoodEntry, UserProfile } from './types'

const STORAGE_KEY = 'bemore-state-v1'

const EMPTY: AppState = { profile: null, checkIns: [], foodLog: [], chat: [] }

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    return EMPTY
  }
}

interface Store {
  state: AppState
  setProfile: (p: UserProfile) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  addCheckIn: (r: CheckInRecord) => void
  addFood: (f: FoodEntry) => void
  removeFood: (id: string) => void
  addChat: (m: ChatMessage) => void
  reset: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const store: Store = {
    state,
    setProfile: (profile) => setState((s) => ({ ...s, profile })),
    updateProfile: (patch) =>
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s)),
    addCheckIn: (r) =>
      setState((s) => ({ ...s, checkIns: [...s.checkIns.filter((c) => c.date !== r.date), r] })),
    addFood: (f) => setState((s) => ({ ...s, foodLog: [...s.foodLog, f] })),
    removeFood: (id) => setState((s) => ({ ...s, foodLog: s.foodLog.filter((f) => f.id !== id) })),
    addChat: (m) => setState((s) => ({ ...s, chat: [...s.chat.slice(-199), m] })),
    reset: () => setState(EMPTY),
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** Consecutive days ending today (or yesterday, so the streak isn't lost before checking in) */
export function currentStreak(checkIns: CheckInRecord[]): number {
  const dates = new Set(checkIns.map((c) => c.date))
  let streak = 0
  const cursor = new Date()
  if (!dates.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(todayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
