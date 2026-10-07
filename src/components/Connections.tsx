import { useState } from 'react'
import { useStore } from '../lib/store'
import type { ConnectionId } from '../lib/types'

/**
 * Plug Be More into the rest of your life: calendars so the warm-up lands in
 * your diary, health apps so the coach sees your numbers, messaging so nudges
 * reach you where you already are.
 *
 * DEMO for now: tapping "connects" locally (remembered on the profile) and
 * nothing syncs yet. Each tile says so. Swap `connect()` for the real OAuth
 * hand-off per provider when those land.
 */
export interface Connection {
  id: ConnectionId
  name: string
  icon: string
  kind: 'calendar' | 'health' | 'messaging'
  blurb: string
}

export const CONNECTIONS: Connection[] = [
  { id: 'google-calendar', name: 'Google Calendar', icon: '📅', kind: 'calendar', blurb: 'Your warm-up and both daily calls, in your diary' },
  { id: 'outlook-calendar', name: 'Outlook calendar', icon: '🗓️', kind: 'calendar', blurb: 'Your warm-up and both daily calls, in your diary' },
  { id: 'apple-health', name: 'Apple Health', icon: '❤️', kind: 'health', blurb: 'Steps, weight and workouts flow in automatically' },
  { id: 'google-fit', name: 'Google Fit', icon: '🏃', kind: 'health', blurb: 'Steps, weight and workouts flow in automatically' },
  { id: 'strava', name: 'Strava', icon: '🚴', kind: 'health', blurb: 'Every run and ride counts towards the plan' },
  { id: 'myfitnesspal', name: 'MyFitnessPal', icon: '🥗', kind: 'health', blurb: 'Food you log there shows up here' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', kind: 'messaging', blurb: 'Nudges and your evening summary where you already chat' },
]

export function useConnections() {
  const { state, updateProfile } = useStore()
  const connected = state.profile?.connections ?? []
  const [busy, setBusy] = useState<ConnectionId | null>(null)
  const isConnected = (id: ConnectionId) => connected.includes(id)
  const connect = async (id: ConnectionId) => {
    setBusy(id)
    // Demo: a beat of "talking to the provider", then connected. Real OAuth goes here.
    await new Promise((r) => setTimeout(r, 900))
    updateProfile({ connections: isConnected(id) ? connected.filter((c) => c !== id) : [...connected, id] })
    setBusy(null)
  }
  return { connected, busy, isConnected, connect }
}

/** The calendar hook-up, as a pair of big buttons for the plan screen */
export function CalendarPlugIn({ purpose = 'to create your warm-up' }: { purpose?: string }) {
  const { busy, isConnected, connect } = useConnections()
  const calendars = CONNECTIONS.filter((c) => c.kind === 'calendar')
  return (
    <div className="space-y-2">
      {calendars.map((c) => {
        const on = isConnected(c.id)
        return (
          <button
            key={c.id}
            onClick={() => connect(c.id)}
            disabled={busy !== null}
            aria-pressed={on}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all disabled:opacity-60 ${
              on ? 'bg-leaf/15 ring-1 ring-leaf/40' : 'bg-black/[0.05] hover:bg-black/[0.08]'
            }`}
          >
            <span className="text-2xl leading-none">{c.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium leading-tight">
                {on ? `${c.name} connected` : `Plug into your ${c.name} ${purpose}`}
              </span>
              <span className="mt-0.5 block text-xs text-ink-secondary">
                {busy === c.id ? 'Connecting…' : on ? 'Demo — nothing is written to your calendar yet' : c.blurb}
              </span>
            </span>
            <span className={`shrink-0 text-sm font-semibold ${on ? 'text-leaf' : 'text-accent'}`}>{busy === c.id ? '…' : on ? '✓' : '→'}</span>
          </button>
        )
      })}
    </div>
  )
}

/** The full connect list for Settings */
export function ConnectList() {
  const { busy, isConnected, connect } = useConnections()
  const groups: { kind: Connection['kind']; title: string }[] = [
    { kind: 'calendar', title: 'Calendars' },
    { kind: 'health', title: 'Health & fitness' },
    { kind: 'messaging', title: 'Messaging' },
  ]
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.kind}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary">{g.title}</p>
          <div className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-black/[0.03]">
            {CONNECTIONS.filter((c) => c.kind === g.kind).map((c) => {
              const on = isConnected(c.id)
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl leading-none">{c.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{c.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-secondary">{on ? 'Connected · demo' : c.blurb}</p>
                  </div>
                  <button
                    onClick={() => connect(c.id)}
                    disabled={busy !== null}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all disabled:opacity-60 ${
                      on ? 'bg-white shadow-card text-ink-secondary' : 'bg-ink text-white'
                    }`}
                  >
                    {busy === c.id ? '…' : on ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-ink-secondary">
        Connections are a preview: they're remembered on your profile but nothing syncs yet.
      </p>
    </div>
  )
}
