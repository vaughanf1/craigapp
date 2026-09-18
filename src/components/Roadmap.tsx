import { useState } from 'react'
import { motion } from 'framer-motion'
import { todayKey, useStore } from '../lib/store'
import { currentMilestone, daysBetween, weightProgress } from '../lib/roadmap'
import { formatWeight, parseWeightToKg } from '../lib/units'
import type { Roadmap } from '../lib/types'
import { Card } from './ui'

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.slice(0, 4) !== todayKey().slice(0, 4) ? 'numeric' : undefined })

/** The reverse-engineered plan as a timeline of stops, with where you stand */
export function RoadmapTimeline({ roadmap, compact = false }: { roadmap: Roadmap; compact?: boolean }) {
  const { state } = useStore()
  const profile = state.profile!
  const today = todayKey()
  const unit = profile.weightUnit ?? (profile.accent === 'american' ? 'lbs' : 'stone')
  const { index } = currentMilestone(roadmap, today)
  const fmtMetric = (m: NonNullable<Roadmap['milestones'][number]['metric']>) =>
    m.unit === 'kg' ? formatWeight(m.target, unit) : `${m.target} ${m.unit}`

  return (
    <ol className="relative ml-3 border-l-2 border-black/10">
      {roadmap.milestones.map((m, i) => {
        const done = i < index || index === -1
        const current = i === index
        return (
          <li key={m.id} className={`relative pl-6 ${i < roadmap.milestones.length - 1 ? (compact ? 'pb-4' : 'pb-6') : ''}`}>
            <span
              className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                done ? 'bg-leaf text-white' : current ? 'bg-accent ring-4 ring-accent/20' : 'bg-white ring-2 ring-black/15'
              }`}
            >
              {done ? '✓' : ''}
            </span>
            <p className={`font-semibold ${current ? 'text-accent' : ''}`}>
              {m.title}
              {m.metric && <span className="ml-2 font-normal text-ink-secondary">{fmtMetric(m.metric)}</span>}
            </p>
            <p className="text-sm text-ink-secondary">
              {fmtDate(m.targetDate)}
              {current && ` · ${Math.max(0, daysBetween(today, m.targetDate))} days`}
            </p>
            {!compact && <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{m.why}</p>}
          </li>
        )
      })}
    </ol>
  )
}

/** Weight goals: on track / ahead / behind against the current stop, plus a weigh-in box */
export function WeightStanding({ roadmap }: { roadmap: Roadmap }) {
  const { state, addWeighIn } = useStore()
  const profile = state.profile!
  const today = todayKey()
  const unit = profile.weightUnit ?? (profile.accent === 'american' ? 'lbs' : 'stone')
  const [draft, setDraft] = useState('')
  if (!profile.weightKg) return null
  const latest = state.weighIns.at(-1)
  const startDate = new Date(profile.createdAt).toISOString().slice(0, 10)
  const wp = latest ? weightProgress(roadmap, profile.weightKg, latest.kg, today, startDate) : null
  const { current } = currentMilestone(roadmap, today)

  const submit = () => {
    const kg = parseWeightToKg(draft) ?? (unit === 'kg' ? Number(draft) : null)
    if (!kg || kg < 20 || kg > 400) return
    addWeighIn({ date: today, kg })
    setDraft('')
  }

  const tone = wp?.status === 'behind' ? 'bg-coral/10 text-coral' : wp?.status === 'ahead' ? 'bg-leaf/15 text-leaf' : 'bg-accent/10 text-accent'

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Where you stand</h2>
        {wp && <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>{wp.status}</span>}
      </div>
      {latest && wp && current ? (
        <p className="mt-2 text-[15px] leading-relaxed">
          <strong>{formatWeight(latest.kg, unit)}</strong> on {fmtDate(latest.date)}. To be on track for{' '}
          <strong>{current.title}</strong> you'd be {formatWeight(wp.expectedKg, unit)} today
          {wp.status !== 'on track' && ` — ${formatWeight(Math.abs(wp.aheadKg), unit === 'stone' ? 'lbs' : unit)} ${wp.status}`}. {wp.daysLeft} days to go.
        </p>
      ) : (
        <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">
          No weigh-in yet. Hop on the scales and log it — weekly is plenty.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={unit === 'stone' ? 'e.g. 12 stone 12' : unit === 'lbs' ? 'e.g. 180 lbs' : 'e.g. 81.5 kg'}
          inputMode="decimal"
          className="min-w-0 flex-1 rounded-full bg-black/[0.04] px-4 py-2.5 text-[15px] outline-none ring-accent/50 focus:ring-2"
        />
        <button onClick={submit} disabled={!draft.trim()} className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">
          Log weigh-in
        </button>
      </div>
    </Card>
  )
}

/** Today's daily actions — the things the evening call asks about */
export function DailyActions({ roadmap, title = "Today's actions" }: { roadmap: Roadmap; title?: string }) {
  const { state, setAction } = useStore()
  const today = todayKey()
  const isDone = (id: string) => state.actionLog.some((a) => a.date === today && a.actionId === id && a.done)
  const weekCount = (id: string) => {
    const from = new Date()
    from.setDate(from.getDate() - 6)
    const fromKey = todayKey(from)
    return state.actionLog.filter((a) => a.actionId === id && a.done && a.date >= fromKey).length
  }
  const doneCount = roadmap.dailyActions.filter((a) => isDone(a.id)).length
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-ink-secondary">
          {doneCount}/{roadmap.dailyActions.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {roadmap.dailyActions.map((a) => {
          const done = isDone(a.id)
          return (
            <li key={a.id}>
              <button
                onClick={() => setAction({ date: today, actionId: a.id, done: !done })}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-black/[0.03]"
              >
                <motion.span
                  animate={{ scale: done ? [1, 1.2, 1] : 1 }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
                    done ? 'border-leaf bg-leaf text-white' : 'border-black/20'
                  }`}
                >
                  {done ? '✓' : ''}
                </motion.span>
                <span className={`flex-1 text-[15px] ${done ? 'text-ink-secondary line-through' : ''}`}>{a.text}</span>
                <span className="text-xs text-ink-secondary">{weekCount(a.id)}/7</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
