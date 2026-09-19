import { useState } from 'react'
import { motion } from 'framer-motion'
import { todayKey, useStore } from '../lib/store'
import { boardColumns, currentPhase, addDays } from '../lib/warmap'
import type { Task, WarMap } from '../lib/types'
import { Card } from './ui'

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const monthLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })

/** Phases laid across the horizon like a Gantt bar, with today marked */
export function HorizonBar({ map }: { map: WarMap }) {
  const today = todayKey()
  const total = Math.max(1, days(map.horizon.start, map.horizon.end))
  const pct = (d: string) => Math.min(100, Math.max(0, (days(map.horizon.start, d) / total) * 100))
  const cur = currentPhase(map, today)
  // One label per month start; drop any that would sit on top of a neighbour
  const months: string[] = []
  for (let d = map.horizon.start; d <= map.horizon.end; d = addDays(d, 1)) {
    if (d.endsWith('-01')) months.push(d)
  }
  if (months.length === 0 || pct(months[0]) > 9) months.unshift(map.horizon.start)
  return (
    <div>
      <div className="relative h-9 overflow-hidden rounded-full bg-black/[0.06]">
        {map.phases.map((p, i) => {
          const left = pct(p.start)
          const width = Math.max(2, pct(addDays(p.end, 1)) - left)
          const active = cur?.id === p.id
          return (
            <div
              key={p.id}
              title={`${p.name}: ${fmt(p.start)} – ${fmt(p.end)}`}
              className={`absolute top-0 flex h-full items-center overflow-hidden px-2 text-[11px] font-semibold ${
                active ? 'bg-accent text-white' : i % 2 ? 'bg-ink/80 text-white' : 'bg-ink/60 text-white'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="truncate">{p.name}</span>
            </div>
          )
        })}
        <div className="absolute top-0 h-full w-0.5 bg-coral" style={{ left: `${pct(today)}%` }} aria-label="Today" />
      </div>
      <div className="relative mt-1 h-4 text-[10px] uppercase tracking-wide text-ink-secondary">
        {months.map((m) => (
          <span key={m} className="absolute -translate-x-1/2" style={{ left: `${pct(m)}%` }}>
            {monthLabel(m)}
          </span>
        ))}
      </div>
    </div>
  )
}

function days(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400_000)
}

export function Phases({ map }: { map: WarMap }) {
  const today = todayKey()
  const cur = currentPhase(map, today)
  const [open, setOpen] = useState<string | null>(cur?.id ?? map.phases[0]?.id ?? null)
  return (
    <ol className="space-y-2">
      {map.phases.map((p, i) => {
        const past = p.end < today
        const active = cur?.id === p.id
        const isOpen = open === p.id
        return (
          <li key={p.id} className={`rounded-2xl border ${active ? 'border-accent/40 bg-accent/5' : 'border-black/5 bg-white'}`}>
            <button onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full items-center gap-3 p-3.5 text-left">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${past ? 'bg-leaf text-white' : active ? 'bg-accent text-white' : 'bg-black/10'}`}>
                {past ? '✓' : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.name}</span>
                <span className="block truncate text-xs text-ink-secondary">
                  {fmt(p.start)} – {fmt(p.end)} · {p.objective}
                </span>
              </span>
              <span className="text-ink-secondary">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 pl-[3.25rem]">
                <p className="text-[15px] leading-relaxed">{p.objective}</p>
                <ul className="mt-2 space-y-1.5">
                  {p.keyResults.map((k) => (
                    <li key={k.id} className="flex items-start gap-2 text-sm">
                      <span className={k.done ? 'text-leaf' : 'text-ink-secondary'}>{k.done ? '✓' : '○'}</span>
                      <span>
                        {k.text}
                        {k.metric && <span className="text-ink-secondary"> · {k.metric.label} {k.metric.target} {k.metric.unit}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** The board: overdue / this week / up next / done. Tap to tick, long text to open. */
export function Board({ compact = false }: { compact?: boolean }) {
  const { state, updateTask, addTask, removeTask } = useStore()
  const today = todayKey()
  const cols = boardColumns(state.tasks, today)
  const [tab, setTab] = useState<'week' | 'next' | 'done'>('week')
  const [draft, setDraft] = useState('')
  const [due, setDue] = useState('')
  const phase = state.warmap ? currentPhase(state.warmap, today) : null

  const list = tab === 'week' ? [...cols.overdue, ...cols.thisWeek] : tab === 'next' ? cols.upNext : cols.done
  const shown = compact ? list.slice(0, 4) : list

  const submit = () => {
    const title = draft.trim()
    if (!title) return
    addTask({ title, detail: '', due: due || null, effort: 'M', phaseId: phase?.id ?? null })
    setDraft('')
    setDue('')
  }

  const row = (t: Task) => {
    const overdue = t.due && t.due < today && t.status !== 'done'
    return (
      <motion.li key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 rounded-2xl px-2 py-2 hover:bg-black/[0.03]">
        <button
          onClick={() => updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' })}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${t.status === 'done' ? 'border-leaf bg-leaf text-white' : 'border-black/20'}`}
          aria-label={t.status === 'done' ? 'Mark not done' : 'Mark done'}
        >
          {t.status === 'done' ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] leading-snug ${t.status === 'done' ? 'text-ink-secondary line-through' : ''}`}>{t.title}</p>
          {!compact && t.detail && <p className="mt-0.5 text-sm text-ink-secondary">{t.detail}</p>}
          <p className="mt-0.5 text-xs text-ink-secondary">
            {t.due ? <span className={overdue ? 'font-semibold text-coral' : ''}>{overdue ? 'Overdue · ' : ''}{fmt(t.due)}</span> : 'Any time'}
            {t.source === 'coach' && ' · from your call'}
            {t.source === 'user' && ' · yours'}
            {t.effort === 'L' && ' · big one'}
          </p>
        </div>
        {!compact && (
          <button onClick={() => removeTask(t.id)} className="text-xs text-ink-secondary hover:text-coral" aria-label="Remove">
            ✕
          </button>
        )}
      </motion.li>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="shrink-0 font-semibold">The board</h2>
        <div className="flex gap-1 rounded-full bg-black/[0.05] p-1 text-xs font-medium">
          {([['week', `Week${cols.overdue.length + cols.thisWeek.length ? ` · ${cols.overdue.length + cols.thisWeek.length}` : ''}`], ['next', 'Next'], ['done', 'Done']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 ${tab === k ? 'bg-white shadow-card' : 'text-ink-secondary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {shown.map(row)}
        {shown.length === 0 && (
          <li className="py-4 text-center text-sm text-ink-secondary">
            {tab === 'done' ? 'Nothing ticked off yet.' : tab === 'week' ? 'Nothing due this week — say what you\'ll do on the evening call and it lands here.' : 'Nothing queued.'}
          </li>
        )}
      </ul>
      {!compact && tab !== 'done' && (
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Add a task…"
            className="min-w-0 flex-1 rounded-full bg-black/[0.04] px-4 py-2.5 text-[15px] outline-none ring-accent/50 focus:ring-2"
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-[8.5rem] rounded-full bg-black/[0.04] px-3 py-2.5 text-sm outline-none" aria-label="Due date" />
          <button onClick={submit} disabled={!draft.trim()} className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">
            Add
          </button>
        </div>
      )}
    </Card>
  )
}

/** How the plan was reasoned — the board-review loop, shown for trust */
export function BuildLog({ map }: { map: WarMap }) {
  const [open, setOpen] = useState(false)
  if (!map.buildLog.length) return null
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="text-sm text-accent">
        {open ? 'Hide' : 'How this plan was built'} · {map.buildLog.length} round{map.buildLog.length === 1 ? '' : 's'} of review
      </button>
      {open && (
        <ol className="mt-2 space-y-2">
          {map.buildLog.map((b) => (
            <li key={b.iteration} className="rounded-2xl bg-black/[0.04] p-3 text-sm">
              <p className="font-semibold">
                Draft {b.iteration} · scored {b.score}/10
              </p>
              <p className="mt-0.5 text-ink-secondary">{b.verdict}</p>
              {b.issues.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-ink-secondary">
                  {b.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
