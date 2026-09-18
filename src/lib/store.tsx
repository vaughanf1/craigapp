import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ActionLog, AppState, CheckInRecord, ChatMessage, FoodEntry, Roadmap, UserProfile, WeighIn } from './types'
import { api, mirror, type MeResponse } from './api'

const STORAGE_KEY = 'bemore-state-v1'

const EMPTY: AppState = { profile: null, checkIns: [], foodLog: [], chat: [], weighIns: [], actionLog: [], session: null }

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
  addWeighIn: (w: WeighIn) => void
  setAction: (a: ActionLog) => void
  setRoadmap: (r: Roadmap) => void
  reset: () => void
  /** Whether this build talks to a Be More server and the user is signed in */
  online: boolean
  /** Replace local state with what the server holds (after sign-in) */
  hydrate: (me: MeResponse) => void
  signOut: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable (sandboxed iframe, private browsing) — state stays in memory
    }
  }, [state])

  const online = api.connected && Boolean(state.session)

  const hydrate = useCallback((me: MeResponse) => {
    setState((s) => ({
      profile: me.user.profile ?? s.profile,
      checkIns: me.checkIns,
      foodLog: me.foodLog,
      weighIns: me.weighIns ?? [],
      actionLog: me.actionLog ?? [],
      chat: me.chat.map((m) => ({ id: m.id, from: m.from, text: m.text, timestamp: m.timestamp })),
      session: { phone: me.user.phone, userId: me.user.id, timezone: me.user.timezone, memoryCount: me.memoryCount },
    }))
  }, [])

  // Re-hydrate on launch when a session token exists (e.g. opened from a push notification)
  useEffect(() => {
    if (!api.connected || !api.hasToken()) return
    api.me().then(hydrate).catch(() => setState((s) => ({ ...s, session: null })))
  }, [hydrate])

  const store: Store = {
    state,
    online,
    hydrate,
    signOut: () => {
      api.auth.logout()
      setState((s) => ({ ...s, session: null }))
    },
    setProfile: (profile) => {
      setState((s) => ({ ...s, profile }))
      mirror(() => api.saveProfile(profile))
    },
    updateProfile: (patch) =>
      setState((s) => {
        if (!s.profile) return s
        const profile = { ...s.profile, ...patch }
        mirror(() => api.saveProfile(profile))
        return { ...s, profile }
      }),
    addCheckIn: (r) => {
      setState((s) => ({ ...s, checkIns: [...s.checkIns.filter((c) => c.date !== r.date), r] }))
      mirror(() => api.checkIn(r))
    },
    addFood: (f) => {
      setState((s) => ({ ...s, foodLog: [...s.foodLog, f] }))
      mirror(() => api.addFood(f))
    },
    removeFood: (id) => {
      setState((s) => ({ ...s, foodLog: s.foodLog.filter((f) => f.id !== id) }))
      mirror(() => api.removeFood(id))
    },
    addChat: (m) => setState((s) => ({ ...s, chat: [...s.chat.slice(-199), m] })),
    addWeighIn: (w) => {
      setState((s) => ({ ...s, weighIns: [...s.weighIns.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) }))
      mirror(() => api.weighIn(w))
    },
    setAction: (a) => {
      setState((s) => ({
        ...s,
        actionLog: [...s.actionLog.filter((x) => !(x.date === a.date && x.actionId === a.actionId)), a],
      }))
      mirror(() => api.setAction(a))
    },
    setRoadmap: (roadmap) =>
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, plan: { ...s.profile.plan, roadmap } } } : s)),
    reset: () => {
      api.signOut()
      setState(EMPTY)
    },
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

/**
 * Consecutive days ending today (or yesterday, so the streak isn't lost
 * before checking in). One missed day per rolling week is "frozen" rather
 * than breaking the streak — a stumble is not a fall.
 */
export function currentStreak(checkIns: CheckInRecord[]): number {
  const dates = new Set(checkIns.map((c) => c.date))
  let streak = 0
  let daysSinceFreeze = 8 // a freeze is available immediately
  const cursor = new Date()
  if (!dates.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)

  for (;;) {
    if (dates.has(todayKey(cursor))) {
      streak++
      daysSinceFreeze++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      // freeze: skip a single missed day if the day before it was kept
      // and no freeze was used in the last 7 days
      const dayBefore = new Date(cursor)
      dayBefore.setDate(dayBefore.getDate() - 1)
      if (daysSinceFreeze > 7 && dates.has(todayKey(dayBefore))) {
        daysSinceFreeze = 0
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }
  }
  return streak
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
