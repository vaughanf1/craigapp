import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { COACHES } from '../data/coaches'
import { CoachFace } from './CoachFace'
import { useCoachIntro } from './CoachIntro'
import type { CoachAgeBand, CoachGender } from '../lib/types'

const AGES: CoachAgeBand[] = ['20s', '30s', '40s', '50s']

/**
 * Pick your coach the way you'd pick a PT: who do you want in your corner?
 * Filter by gender and age, then meet the coach — their intro clip plays
 * with sound when you tap them.
 */
export default function CoachPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string | null
  onChange: (coachId: string) => void
  compact?: boolean
}) {
  const current = COACHES.find((c) => c.id === value)
  const { openIntro } = useCoachIntro()
  const [gender, setGender] = useState<CoachGender | 'any'>(current?.gender ?? 'any')
  const [age, setAge] = useState<CoachAgeBand | 'any'>(current?.ageBand ?? 'any')
  /** Set when the user taps a coach — plays that coach's intro with sound */
  const [previewing, setPreviewing] = useState<string | null>(null)

  const matches = useMemo(
    () => COACHES.filter((c) => (gender === 'any' || c.gender === gender) && (age === 'any' || c.ageBand === age)),
    [gender, age],
  )

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
      active ? 'bg-ink text-white' : 'bg-white shadow-card hairline text-ink-secondary hover:text-ink'
    }`

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(['any', 'female', 'male'] as const).map((g) => (
          <button key={g} onClick={() => setGender(g)} className={chip(gender === g)}>
            {g === 'any' ? 'Anyone' : g === 'female' ? 'Woman' : 'Man'}
          </button>
        ))}
        <span className="w-2" />
        {(['any', ...AGES] as const).map((a) => (
          <button key={a} onClick={() => setAge(a)} className={chip(age === a)}>
            {a === 'any' ? 'Any age' : `In their ${a}`}
          </button>
        ))}
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {matches.map((c) => {
          const selected = value === c.id
          return (
            <motion.button
              key={c.id}
              layout
              onClick={() => {
                onChange(c.id)
                setPreviewing(c.id)
                // The intro plays full screen with sound, started inside this tap
                openIntro(c, { onChoose: () => onChange(c.id) })
              }}
              className={`flex flex-col items-center rounded-3xl bg-white p-3 text-center transition-all ${
                selected ? 'shadow-float ring-2 ring-accent' : 'shadow-card hairline hover:shadow-float'
              }`}
            >
              <CoachFace coach={c} size={compact ? 'md' : 'lg'} playing={selected || previewing === c.id} tappable={false} />
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              {!compact && (
                <p className="text-xs text-ink-secondary">
                  {c.ageBand} · {c.style}
                </p>
              )}
            </motion.button>
          )
        })}
        {matches.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-ink-secondary">No coach matches that yet — try another age.</p>
        )}
      </div>

      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card hairline"
        >
          <CoachFace coach={current} size="lg" playing tappable={false} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {current.name} <span className="font-normal text-ink-secondary">· {current.ageBand} · {current.style}</span>
            </p>
            {!compact && <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{current.bio}</p>}
            <button
              onClick={() => openIntro(current)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
            >
              ▶ Meet {current.name}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
