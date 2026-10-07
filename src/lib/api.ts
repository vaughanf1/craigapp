import type { ActionLog, CheckInRecord, FoodEntry, Roadmap, UserProfile, WeighIn } from './types'
import type { Task, WarMap } from './warmap'
import type { AccountabilityMonth } from './pricing'

/**
 * Be More API client. When VITE_API_URL is unset the app runs local-only
 * (everything in localStorage, no calls, no memory engine) — every call here
 * is guarded by `api.connected` so the UI degrades cleanly.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const TOKEN_KEY = 'bemore-token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable — session lives for this tab only
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 401) setToken(null)
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
  return body as T
}

const post = <T,>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
const put = <T,>(path: string, data: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) })
const del = <T,>(path: string) => request<T>(path, { method: 'DELETE' })

export interface OnboardingSuggestions {
  reflection: string
  sharper: string | null
  benefits: string[]
  obstacles: string[]
  supporters: string[]
  skills: string[]
  actionPlanDraft: string
}

export interface ServerUser {
  id: string
  phone: string
  timezone: string
  profile: UserProfile | null
  createdAt: number
}
export interface Schedule {
  times: string[]
  channels: ('push' | 'call')[]
  enabled: boolean
}
export interface LiveCallSession {
  token: string
  agentId: string
  overrides: {
    agent: { prompt: { prompt: string }; firstMessage: string; language: 'en' }
    tts: { voiceId: string }
  }
}

export interface Delivery {
  id: string
  date: string
  slot: string
  kind: 'morning' | 'evening' | 'manual'
  brief: string
  channels: string[]
  status: string
  createdAt: number
  answeredAt: number | null
}
export interface PlanReview {
  id: string
  date: string
  trigger: 'weekly' | 'behind' | 'manual'
  decision: 'keep' | 'adjust'
  reason: string
  coachNote: string
  changes: string[]
  explained: boolean
  createdAt: number
}
export interface Memory {
  id: string
  kind: 'fact' | 'preference' | 'pattern' | 'event' | 'win' | 'struggle'
  text: string
  importance: number
  source: string
  createdAt: number
  updatedAt: number
}
export interface DaySummary {
  date: string
  summary: string
  mood: string
  wins: string
  struggles: string
  tomorrowFocus: string
  caloriesIn: number | null
  caloriesTarget: number | null
}
export interface MeResponse {
  user: ServerUser
  checkIns: CheckInRecord[]
  foodLog: FoodEntry[]
  weighIns: WeighIn[]
  actionLog: ActionLog[]
  chat: { id: string; from: 'user' | 'coach'; text: string; timestamp: number; channel: string }[]
  schedule: Schedule
  memoryCount: number
  push: { enabled: boolean; publicKey: string }
  calls: { enabled: boolean }
}

export const api = {
  isSignedIn: () => Boolean(getToken()),
  /** True when a server is configured for this build */
  connected: Boolean(BASE),
  hasToken: () => Boolean(getToken()),
  signOut: () => setToken(null),

  auth: {
    requestCode: (phone: string) => post<{ ok: true; phone: string; dev: boolean }>('/auth/request-code', { phone }),
    verify: async (phone: string, code: string) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const r = await post<{ token: string; user: ServerUser }>('/auth/verify', { phone, code, timezone })
      setToken(r.token)
      return r.user
    },
    logout: async () => {
      await post('/auth/logout').catch(() => {})
      setToken(null)
    },
  },

  me: () => request<MeResponse>('/me'),
  saveProfile: (profile: UserProfile) => put<{ ok: true }>('/me/profile', profile),
  checkIn: (c: CheckInRecord) => post<{ ok: true }>('/me/checkins', c),
  addFood: (f: FoodEntry) => post<{ ok: true }>('/me/food', f),
  removeFood: (id: string) => del<{ ok: true }>(`/me/food/${id}`),
  weighIn: (w: WeighIn) => post<{ ok: true }>('/me/weighins', w),
  foodPhoto: (dataUrl: string, note = '') =>
    post<{ items: { label: string; portion: string; calories: number; confidence: 'low' | 'medium' | 'high' }[]; totalCalories: number; isFood: boolean; coachNote: string }>('/me/food/photo', { image: dataUrl, mediaType: 'image/jpeg', note }),
  setAction: (a: ActionLog) => post<{ ok: true }>('/me/actions', a),
  schedule: () => request<Schedule>('/me/schedule'),
  accountability: () => request<AccountabilityMonth>('/me/accountability'),
  saveSchedule: (s: Schedule) => put<Schedule>('/me/schedule', s),
  exportData: () => request<unknown>('/me/export'),
  deleteAccount: async () => {
    await del('/me')
    setToken(null)
  },

  onboarding: {
    /** The coach reads the typed goal and suggests a plan specific to it. Works before sign-in. */
    suggest: (input: { name?: string; statement: string; targetDate?: string; areaIds: string[]; coachId?: string; weightKg?: number; goalWeightKg?: number; weightUnit?: 'stone' | 'lbs' | 'kg' }) =>
      post<OnboardingSuggestions>('/onboarding/suggest', input),
  },

  coach: {
    roadmap: () => post<Roadmap>('/coach/roadmap'),
    review: () => post<{ review: PlanReview; roadmap: Roadmap }>('/coach/review'),
    warmap: () => request<{ status: 'building' | 'ready' | 'failed' | 'none'; progress: string; map: WarMap | null; tasks: Task[] }>('/coach/warmap'),
    rebuildWarmap: () => post<{ status: string }>('/coach/warmap/rebuild'),
    addTask: (t: { title: string; detail?: string; due?: string | null; effort?: Task['effort']; phaseId?: string | null }) => post<Task>('/coach/tasks', t),
    updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'detail' | 'due' | 'status' | 'effort'>>) => put<Task>(`/coach/tasks/${id}`, patch),
    deleteTask: (id: string) => del<{ ok: true }>(`/coach/tasks/${id}`),
    reviews: () => request<{ reviews: PlanReview[] }>('/coach/reviews'),
    message: (text: string, channel: 'chat' | 'call' = 'chat', mode?: 'wrap-up') => post<{ reply: string }>('/coach/message', { text, channel, mode }),
    /** The coach's voice for one line: audio, or null when the app should use browser speech (204 + X-Voice-Fallback) */
    speak: async (text: string): Promise<Blob | null> => {
      const token = getToken()
      if (!token) return null
      const res = await fetch(`${BASE}/coach/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      })
      if (res.status !== 200) return null
      return res.blob()
    },
    voiceStats: () => request<{ provider: string; user: { month: { requests: number; cached: number; chars: number; costUsd: number; fallbacks: number }; todayChars: number; dailyCapChars: number }; global: { month: { chars: number; costUsd: number; budgetUsd: number } } }>('/coach/speak/stats'),
    callLimits: () => request<{ maxSeconds: number; wrapUpSeconds: number; maxTurns: number }>('/coach/call-limits'),
    callNow: (channels: ('push' | 'call')[]) => post<Delivery>('/coach/call-now', { channels }),
    /** Live two-way voice call: short-lived ElevenLabs token + per-call persona/context overrides. 503 when not configured. */
    liveCall: (deliveryId?: string) => post<LiveCallSession>('/coach/live-call', { deliveryId }),
    liveTurn: (role: 'user' | 'coach', text: string) => post<{ ok: true }>('/coach/live-call/turn', { role, text }),
    deliveries: () => request<Delivery[]>('/coach/deliveries'),
    delivery: (id: string) => request<Delivery>(`/coach/deliveries/${id}`),
    answer: (id: string) => post<{ ok: true; brief: string }>(`/coach/deliveries/${id}/answer`),
    missed: (id: string) => post<{ ok: true }>(`/coach/deliveries/${id}/missed`),
    memory: () => request<{ memories: Memory[]; days: DaySummary[]; intake: Record<string, string> }>('/coach/memory'),
    forget: (id: string) => del<{ ok: true }>(`/coach/memory/${id}`),
    refreshMemory: () => post<{ added: number; archived: number }>('/coach/memory/refresh'),
  },

  push: {
    vapid: () => request<{ enabled: boolean; publicKey: string }>('/push/vapid'),
    subscribe: (sub: PushSubscriptionJSON) => post<{ ok: true }>('/push/subscribe', sub),
    unsubscribe: (endpoint: string) => post<{ ok: true }>('/push/unsubscribe', { endpoint }),
  },
}

/** Fire-and-forget mirror to the server; never blocks the UI, never throws */
export function mirror(fn: () => Promise<unknown>) {
  if (!api.connected || !getToken()) return
  fn().catch((err) => console.warn('[sync] failed', err))
}
