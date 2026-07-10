import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { GOAL_AREAS } from '../data/goalAreas'
import { COACHES, getCoach } from '../data/coaches'
import { useStore } from '../lib/store'
import { speak } from '../lib/coach'
import type { GoalAreaId, VoiceAccent } from '../lib/types'
import TagInput from '../components/TagInput'
import { CoachAvatar, Disclaimer, PrimaryButton, ProgressDots, SecondaryButton } from '../components/ui'

/** Common obstacle/benefit suggestions per Craig's examples */
const OBSTACLE_SUGGESTIONS: Partial<Record<GoalAreaId, string[]>> = {
  health: ['Love of carbs', 'Cakes & sweets', 'Ice cream & chocolate', 'Not wanting to exercise', 'Late-night snacking'],
  habits: ['Social events where others smoke', 'Stress triggers', 'Alcohol lowering willpower', 'Boredom', 'Morning routine cravings'],
  wealth: ['Impulse buying', 'Takeaways', 'Subscriptions', 'Keeping up with friends'],
  career: ['Procrastination', 'Distractions', 'Fear of failure', 'Saying yes to everything'],
}

const BENEFIT_SUGGESTIONS: Partial<Record<GoalAreaId, string[]>> = {
  habits: ['My breath won’t smell', 'My clothes won’t smell', 'I’ll feel better', 'Compliments from friends', 'I’ll live a lot longer', 'Save money'],
  health: ['More energy', 'Feel confident', 'New clothes', 'Live longer', 'Better sleep'],
  wealth: ['Peace of mind', 'Freedom to choose', 'Security for my family'],
  family: ['Closer relationships', 'Happier home', 'Kids who feel valued'],
}

const STEPS = ['about', 'area', 'goal', 'plan', 'coach', 'voice', 'done'] as const

export default function Onboarding() {
  const navigate = useNavigate()
  const { setProfile } = useStore()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [areaId, setAreaId] = useState<GoalAreaId | null>(null)
  const [statement, setStatement] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [benefits, setBenefits] = useState<string[]>([])
  const [obstacles, setObstacles] = useState<string[]>([])
  const [supporters, setSupporters] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [actionPlan, setActionPlan] = useState('')
  const [coachId, setCoachId] = useState<string | null>(null)
  const [accent, setAccent] = useState<VoiceAccent>('british')
  const [checkInsPerDay, setCheckInsPerDay] = useState<1 | 2 | 3 | 4 | 5>(3)

  const area = useMemo(() => GOAL_AREAS.find((a) => a.id === areaId), [areaId])
  const coach = coachId ? getCoach(coachId) : null

  const canNext = (() => {
    switch (STEPS[step]) {
      case 'about':
        return name.trim().length > 0
      case 'area':
        return !!areaId
      case 'goal':
        return statement.trim().length > 0 && !!targetDate
      case 'plan':
        return true
      case 'coach':
        return !!coachId
      case 'voice':
        return true
      default:
        return true
    }
  })()

  const finish = () => {
    if (!areaId || !coachId) return
    setProfile({
      name: name.trim(),
      dob,
      areaId,
      coachId,
      accent,
      voiceEnabled: true,
      checkInsPerDay,
      plan: { statement: statement.trim(), benefits, supporters, obstacles, skills, actionPlan, targetDate },
      createdAt: Date.now(),
    })
    navigate('/app')
  }

  const next = () => {
    if (STEPS[step] === 'done') {
      finish()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-fog">
      <header className="glass sticky top-0 z-50 border-b border-black/5">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <img src="/bemore.svg" alt="" className="h-5 w-5 rounded" /> Be More
          </Link>
          <ProgressDots total={STEPS.length} current={step} />
          <div className="w-16 text-right">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="text-sm text-accent">
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {STEPS[step] === 'about' && (
              <section>
                <h1 className="display-tight text-3xl font-semibold sm:text-4xl">
                  First, a little about you.
                </h1>
                <p className="mt-3 text-ink-secondary">Your coach likes to know who they’re cheering for.</p>
                <div className="mt-8 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Your name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Craig"
                      autoFocus
                      className="w-full rounded-2xl bg-white px-4 py-3.5 text-[17px] shadow-card outline-none ring-accent/50 transition-shadow focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Date of birth</span>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-2xl bg-white px-4 py-3.5 text-[17px] shadow-card outline-none ring-accent/50 transition-shadow focus:ring-2"
                    />
                  </label>
                </div>
              </section>
            )}

            {STEPS[step] === 'area' && (
              <section>
                <h1 className="display-tight text-3xl font-semibold sm:text-4xl">
                  What do you want to be more of?
                </h1>
                <p className="mt-3 text-ink-secondary">Pick the area of your life you want to improve first.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {GOAL_AREAS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAreaId(a.id)}
                      className={`flex items-center gap-3 rounded-3xl p-4 text-left transition-all ${
                        areaId === a.id
                          ? 'bg-white shadow-float ring-2 ring-accent'
                          : 'bg-white shadow-card hairline hover:shadow-float'
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-xl`}
                      >
                        {a.icon}
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">{a.name}</p>
                        <p className="mt-0.5 text-xs text-ink-secondary">{a.examples.slice(0, 2).join(' · ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {STEPS[step] === 'goal' && area && (
              <section>
                <h1 className="display-tight text-3xl font-semibold sm:text-4xl">
                  Write your goal down.
                </h1>
                <p className="mt-3 text-ink-secondary">
                  Precisely and specifically. Clear, meaningful and measurable — and with a target
                  date, or it’s just a wish.
                </p>
                <div className="mt-8 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
                      My {area.name.toLowerCase()} goal
                    </span>
                    <textarea
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      placeholder={`e.g. ${area.examples[0]} — be specific about how much and by when`}
                      rows={3}
                      autoFocus
                      className="w-full resize-none rounded-2xl bg-white px-4 py-3.5 text-[17px] shadow-card outline-none ring-accent/50 transition-shadow focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Target date</span>
                    <input
                      type="date"
                      value={targetDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full rounded-2xl bg-white px-4 py-3.5 text-[17px] shadow-card outline-none ring-accent/50 transition-shadow focus:ring-2"
                    />
                  </label>
                </div>
              </section>
            )}

            {STEPS[step] === 'plan' && area && (
              <section>
                <h1 className="display-tight text-3xl font-semibold sm:text-4xl">Build your plan.</h1>
                <p className="mt-3 text-ink-secondary">
                  The 7-step framework: know what’s in it for you, who’s helping, what’s in the way,
                  and how you’ll get there. Add what applies — you can edit later.
                </p>
                <div className="mt-8 space-y-7">
                  <div>
                    <h3 className="mb-2 font-semibold">💎 What’s in it for you?</h3>
                    <TagInput
                      values={benefits}
                      onChange={setBenefits}
                      placeholder="A benefit of achieving this goal…"
                      suggestions={BENEFIT_SUGGESTIONS[area.id] ?? []}
                    />
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">🧗 Obstacles to overcome</h3>
                    <TagInput
                      values={obstacles}
                      onChange={setObstacles}
                      placeholder="What might get in your way…"
                      suggestions={OBSTACLE_SUGGESTIONS[area.id] ?? []}
                    />
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">🤝 People & groups who’ll help</h3>
                    <TagInput
                      values={supporters}
                      onChange={setSupporters}
                      placeholder="e.g. my partner, running club, past quitters…"
                    />
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">🧠 Skills & knowledge to learn</h3>
                    <TagInput
                      values={skills}
                      onChange={setSkills}
                      placeholder="What do you need to learn…"
                    />
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">🗺️ Plan of action</h3>
                    <textarea
                      value={actionPlan}
                      onChange={(e) => setActionPlan(e.target.value)}
                      placeholder="Break it down: monthly milestones, weekly actions, daily habits…"
                      rows={3}
                      className="w-full resize-none rounded-2xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none ring-accent/50 transition-shadow focus:ring-2"
                    />
                  </div>
                </div>
              </section>
            )}

            {STEPS[step] === 'coach' && (
              <section>
                <h1 className="display-tight text-3xl font-semibold sm:text-4xl">Pick your coach.</h1>
                <p className="mt-3 text-ink-secondary">
                  Your gym buddy for life. Encouraging rather than forgiving — uplifting but
                  realistic.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {COACHES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCoachId(c.id)}
                      className={`flex flex-col items-center rounded-3xl bg-white p-4 text-center transition-all ${
                        coachId === c.id ? 'shadow-float ring-2 ring-accent' : 'shadow-card hairline hover:shadow-float'
                      }`}
                    >
                      <CoachAvatar coach={c} size="md" />
                      <p className="mt-2 text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-ink-secondary">{c.ageBand} · {c.style}</p>
                    </button>
                  ))}
                </div>
                {coach && (
                  <motion.p
                    key={coach.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-5 rounded-2xl bg-white p-4 text-sm leading-relaxed text-ink-secondary shadow-card hairline"
                  >
                    {coach.bio}
                  </motion.p>
                )}
              </section>
            )}

            {STEPS[step] === 'voice' && (
              <section>
                <h1 className="display-tight text-3xl font-semibold sm:text-4xl">Voice & check-ins.</h1>
                <p className="mt-3 text-ink-secondary">
                  How should {coach?.name ?? 'your coach'} sound, and how often should they check in?
                </p>
                <div className="mt-8 space-y-8">
                  <div>
                    <h3 className="mb-3 font-semibold">Accent</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(['british', 'american'] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => {
                            setAccent(a)
                            if (coach)
                              speak(
                                a === 'british'
                                  ? `Hello ${name || 'there'}, I'm ${coach.name}. Let's be more, together.`
                                  : `Hey ${name || 'there'}, I'm ${coach.name}. Let's be more, together.`,
                                a,
                                coach.gender,
                              )
                          }}
                          className={`rounded-3xl bg-white p-5 transition-all ${
                            accent === a ? 'shadow-float ring-2 ring-accent' : 'shadow-card hairline hover:shadow-float'
                          }`}
                        >
                          <p className="text-3xl">{a === 'british' ? '🇬🇧' : '🇺🇸'}</p>
                          <p className="mt-2 font-semibold capitalize">{a}</p>
                          <p className="text-xs text-ink-secondary">Tap to preview</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 font-semibold">Check-ins per day</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          onClick={() => setCheckInsPerDay(n)}
                          className={`rounded-2xl py-3.5 text-lg font-semibold transition-all ${
                            checkInsPerDay === n
                              ? 'bg-accent text-white shadow-float'
                              : 'bg-white shadow-card hairline text-ink hover:shadow-float'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-ink-secondary">
                      {coach?.name ?? 'Your coach'} will check in {checkInsPerDay}{' '}
                      {checkInsPerDay === 1 ? 'time' : 'times'} a day. Change it any time in
                      Settings.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {STEPS[step] === 'done' && coach && area && (
              <section className="text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                  className="mx-auto w-fit"
                >
                  <CoachAvatar coach={coach} size="xl" />
                </motion.div>
                <h1 className="display-tight mt-6 text-3xl font-semibold sm:text-4xl">
                  You’re all set, {name}.
                </h1>
                <p className="mx-auto mt-4 max-w-md text-ink-secondary">
                  {coach.name} is ready to help you with{' '}
                  <span className="font-medium text-ink">{statement || area.name.toLowerCase()}</span>.
                  Remember: you have incredible ability — and with that comes great responsibility.
                </p>
                <Disclaimer className="mx-auto mt-8 max-w-md text-left" />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 border-t border-black/5 glass">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          {step > 0 ? (
            <SecondaryButton onClick={() => setStep((s) => s - 1)}>Back</SecondaryButton>
          ) : (
            <span />
          )}
          <PrimaryButton onClick={next} disabled={!canNext}>
            {STEPS[step] === 'done' ? `Meet ${coach?.name ?? 'your coach'} →` : 'Continue'}
          </PrimaryButton>
        </div>
      </footer>
    </div>
  )
}
