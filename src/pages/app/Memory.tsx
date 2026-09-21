import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../../lib/store'
import { getCoach } from '../../data/coaches'
import { api, type DaySummary, type Memory as MemoryItem } from '../../lib/api'
import { Card, Rise } from '../../components/ui'
import { CoachFace } from '../../components/CoachFace'

const KIND_LABEL: Record<MemoryItem['kind'], string> = {
  fact: 'About you',
  preference: 'What you like',
  pattern: 'Patterns',
  event: 'Coming up',
  win: 'Wins',
  struggle: 'Struggles',
}
const INTAKE = [
  { id: 'why', label: 'Why this goal, really' },
  { id: 'success', label: 'What success looks like' },
  { id: 'baseline', label: 'Where you are now' },
  { id: 'tried', label: 'What you\'ve tried before' },
  { id: 'failure_pattern', label: 'What usually derails you' },
  { id: 'avoiding', label: 'What you\'re avoiding' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'resources', label: 'Resources' },
  { id: 'competing', label: 'Competing priorities' },
  { id: 'environment', label: 'Environment' },
  { id: 'standard', label: 'Your standard' },
]
const KIND_ORDER: MemoryItem['kind'][] = ['event', 'struggle', 'pattern', 'preference', 'fact', 'win']

/**
 * "What your coach knows about you." Every call and chat feeds this. It's
 * the reason the app gets better the longer you use it — and it's yours to
 * see and edit.
 */
export default function Memory() {
  const { state, online } = useStore()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)
  const [memories, setMemories] = useState<MemoryItem[] | null>(null)
  const [days, setDays] = useState<DaySummary[]>([])
  const [intake, setIntake] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!online) return
    api.coach
      .memory()
      .then((r) => {
        setMemories(r.memories)
        setDays([...r.days].reverse())
        setIntake(r.intake ?? {})
      })
      .catch(() => setError("Couldn't load memory right now."))
  }, [online])

  const forget = async (id: string) => {
    setMemories((m) => m?.filter((x) => x.id !== id) ?? null)
    await api.coach.forget(id).catch(() => {})
  }

  const grouped = KIND_ORDER.map((k) => ({ kind: k, items: (memories ?? []).filter((m) => m.kind === k) })).filter((g) => g.items.length)

  return (
    <div className="space-y-5">
      <Rise>
        <div className="flex items-center gap-4">
          <CoachFace coach={coach} size="lg" />
          <div>
            <h1 className="display-tight text-3xl font-semibold">Memory.</h1>
            <p className="text-ink-secondary">What {coach.name} knows about you.</p>
          </div>
        </div>
      </Rise>

      {!online && (
        <Rise delay={0.05}>
          <Card className="p-5">
            <p className="font-semibold">Memory lives in your account</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Sign in and every call, chat and check-in builds {coach.name}'s picture of you — the wedding you're slimming for,
              the weekends that derail you, the wins worth repeating. Switch apps and you'd be starting from scratch.
            </p>
            <Link to="/signin" className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 font-medium text-white">
              Sign in
            </Link>
          </Card>
        </Rise>
      )}

      {online && memories === null && !error && <p className="text-sm text-ink-secondary">Loading…</p>}
      {error && <p className="text-sm text-coral">{error}</p>}

      {online && memories && memories.length === 0 && (
        <Rise delay={0.05}>
          <Card className="p-5 text-sm leading-relaxed text-ink-secondary">
            Nothing yet. Have a proper chat with {coach.name} — or answer a call — and this page fills up.
          </Card>
        </Rise>
      )}

      {online && memories && (
        <Rise delay={0.05}>
          <Card className="p-5">
            <h2 className="font-semibold">The picture {coach.name} is building</h2>
            <p className="mt-0.5 text-sm text-ink-secondary">One question per call until it's complete.</p>
            <ul className="mt-3 space-y-2">
              {INTAKE.map((f) => (
                <li key={f.id} className="flex items-start gap-3 text-[15px] leading-relaxed">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${intake[f.id] ? 'bg-leaf' : 'bg-black/15'}`} />
                  <span>
                    <span className="font-medium">{f.label}</span>
                    {intake[f.id] ? <span className="text-ink-secondary"> — {intake[f.id]}</span> : <span className="text-ink-secondary"> — not yet</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Rise>
      )}

      {grouped.map((g, i) => (
        <Rise key={g.kind} delay={0.05 + i * 0.04}>
          <Card className="p-5">
            <h2 className="font-semibold">{KIND_LABEL[g.kind]}</h2>
            <ul className="mt-3 space-y-2">
              {g.items.map((m) => (
                <motion.li key={m.id} layout className="flex items-start gap-3 text-[15px] leading-relaxed">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${m.importance >= 3 ? 'bg-accent' : 'bg-black/20'}`} />
                  <span className="flex-1">{m.text}</span>
                  <button onClick={() => forget(m.id)} className="-my-2 rounded-full px-3 py-2 text-xs text-ink-secondary hover:bg-black/5 hover:text-coral" aria-label="Forget this">
                    forget
                  </button>
                </motion.li>
              ))}
            </ul>
          </Card>
        </Rise>
      ))}

      {days.length > 0 && (
        <Rise delay={0.3}>
          <Card className="p-5">
            <h2 className="font-semibold">Your days</h2>
            <ol className="mt-3 space-y-4">
              {days.map((d) => (
                <li key={d.date} className="border-l-2 border-black/10 pl-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
                    {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {d.mood && ` · ${d.mood}`}
                    {d.caloriesIn != null && d.caloriesTarget != null && ` · ${d.caloriesIn} / ${d.caloriesTarget} kcal`}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed">{d.summary}</p>
                  {d.tomorrowFocus && <p className="mt-1 text-sm text-accent">→ {d.tomorrowFocus}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </Rise>
      )}

      <p className="text-xs leading-relaxed text-ink-secondary">
        Memory is built by {coach.name} from what you say. Anything here you'd rather they forgot — tap forget. Download
        or delete everything from Settings.
      </p>
    </div>
  )
}
