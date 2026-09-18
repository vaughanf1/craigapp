import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { COACHES } from '../data/coaches'
import { CoachFace } from './CoachFace'
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
              }}
              className={`flex flex-col items-center rounded-3xl bg-white p-3 text-center transition-all ${
                selected ? 'shadow-float ring-2 ring-accent' : 'shadow-card hairline hover:shadow-float'
              }`}
            >
              <CoachFace coach={c} size={compact ? 'md' : 'lg'} playing={selected || previewing === c.id} />
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
          className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card hairline"
        >
          <IntroPlayer coachId={current.id} autoPlay={previewing === current.id} compact={compact} />
          <div className="p-4">
            <p className="font-semibold">
              {current.name} <span className="font-normal text-ink-secondary">· {current.ageBand} · {current.style}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{current.bio}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/** Meet-your-coach clip with sound. Plays immediately after the user taps a coach (a user gesture, so autoplay is allowed). */
function IntroPlayer({ coachId, autoPlay, compact }: { coachId: string; autoPlay: boolean; compact: boolean }) {
  const coach = COACHES.find((c) => c.id === coachId)!
  const [playing, setPlaying] = useState(autoPlay)
  return (
    <button
      onClick={() => setPlaying((p) => !p)}
      className={`relative block w-full bg-black ${compact ? 'aspect-[4/3] max-h-[300px]' : 'aspect-[4/5] max-h-[420px]'}`}
      aria-label={playing ? 'Pause intro' : `Play ${coach.name}'s intro`}
    >
      <video
        key={coach.id}
        src={`${import.meta.env.BASE_URL}${coach.video}`}
        playsInline
        preload="metadata"
        ref={(v) => {
          if (!v) return
          if (playing) v.play().catch(() => setPlaying(false))
          else v.pause()
        }}
        onEnded={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      {!playing && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-ink shadow-float backdrop-blur">
            ▶ Meet {coach.name}
          </span>
        </span>
      )}
    </button>
  )
}
