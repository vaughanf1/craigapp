import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { todayKey, useStore } from '../../lib/store'
import { getCoach } from '../../data/coaches'
import { api, type Schedule } from '../../lib/api'
import { buildLocalRoadmap } from '../../lib/roadmap'
import { speak, stopSpeaking } from '../../lib/coach'
import { CoachFace } from '../../components/CoachFace'
import { RoadmapTimeline, DailyActions } from '../../components/Roadmap'
import { Card, PrimaryButton } from '../../components/ui'
import { pricingRule } from '../../lib/pricing'

/**
 * Right after onboarding: the coach reverse-engineers the goal into a plan,
 * shows it, then you commit to the calls. That's the deal — you show up,
 * the coach shows up.
 */
export default function PlanIntro() {
  const navigate = useNavigate()
  const { state, online, setRoadmap } = useStore()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)
  const [stage, setStage] = useState<'building' | 'plan' | 'commit'>(profile.plan.roadmap ? 'plan' : 'building')
  const [schedule, setSchedule] = useState<Schedule>({ times: ['09:00', '19:00'], channels: ['push', 'call'], enabled: true })
  const [saving, setSaving] = useState(false)
  const built = useRef(false)

  useEffect(() => {
    if (built.current || profile.plan.roadmap) return
    built.current = true
    const build = async () => {
      const local = buildLocalRoadmap({
        statement: profile.plan.statement,
        targetDate: profile.plan.targetDate || todayKey(),
        areaId: profile.areaId,
        areaIds: profile.areaIds,
        actionPlan: profile.plan.actionPlan,
        obstacles: profile.plan.obstacles,
        weightKg: profile.weightKg,
        goalWeightKg: profile.goalWeightKg,
        weightUnit: profile.weightUnit,
        today: todayKey(),
      })
      let roadmap = local
      if (online) {
        try {
          roadmap = await api.coach.roadmap()
        } catch {
          roadmap = local
        }
      }
      setRoadmap(roadmap)
      setStage('plan')
      if (profile.voiceEnabled) speak(`Right, ${profile.name}. ${roadmap.summary}`, profile.accent, coach.gender)
    }
    // A beat of "thinking" so the plan feels worked out, not instant
    const t = setTimeout(build, online ? 0 : 1800)
    return () => {
      clearTimeout(t)
      built.current = false // StrictMode re-runs effects: allow the real run to build
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (online) api.schedule().then(setSchedule).catch(() => {})
    return stopSpeaking
  }, [online])

  const commit = async () => {
    setSaving(true)
    if (online) await api.saveSchedule(schedule).catch(() => {})
    setSaving(false)
    navigate('/app', { replace: true })
  }

  const roadmap = profile.plan.roadmap

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-fog">
      <main className="flex-1 px-5 pb-32 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <AnimatePresence mode="wait">
          {stage === 'building' && (
            <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center pt-20 text-center">
              <CoachFace coach={coach} size="hero" playing speaking tappable={false} />
              <h1 className="display-tight mt-8 text-3xl font-semibold">Working backwards…</h1>
              <p className="mt-3 max-w-xs text-ink-secondary">
                {coach.name} is turning "{profile.plan.statement}" into stops you can see from here.
              </p>
            </motion.div>
          )}

          {stage === 'plan' && roadmap && (
            <motion.div key="plan" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex items-center gap-4">
                <CoachFace coach={coach} size="lg" />
                <div>
                  <h1 className="display-tight text-3xl font-semibold">Your plan.</h1>
                  <p className="text-ink-secondary">Reverse-engineered from your goal.</p>
                </div>
              </div>
              <Card className="p-5">
                <p className="text-[15px] leading-relaxed">{roadmap.summary}</p>
              </Card>
              <Card className="p-5">
                <h2 className="mb-4 font-semibold">The stops</h2>
                <RoadmapTimeline roadmap={roadmap} />
              </Card>
              <Card className="p-5">
                <h2 className="font-semibold">Every week</h2>
                <ul className="mt-2 space-y-1.5 text-[15px]">
                  {roadmap.weeklyCommitments.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-accent">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </Card>
              <DailyActions roadmap={roadmap} title="Every day" />
              <Card className="p-5">
                <p className="font-semibold">Next: the war map</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                  {online
                    ? `${coach.name} is now drafting the rest of your year — phases, key results and a board of tasks — and putting it through a tough review before you see it. It'll be on the Map tab in a minute or two.`
                    : `The Map tab lays this out across the rest of the year with a board of tasks.`}
                </p>
              </Card>
            </motion.div>
          )}

          {stage === 'commit' && (
            <motion.div key="commit" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex flex-col items-center pt-6 text-center">
                <CoachFace coach={coach} size="xl" playing />
                <h1 className="display-tight mt-6 text-3xl font-semibold">The deal.</h1>
                <p className="mt-3 max-w-sm text-ink-secondary">
                  {coach.name} calls you every morning with yesterday's numbers and today's one thing, and every evening to
                  check what got done. You answer. That's it.
                </p>
              </div>
              <Card className="divide-y divide-black/5 p-0">
                {schedule.times.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-semibold">{i === 0 ? 'Morning call' : i === schedule.times.length - 1 ? 'Evening review' : 'Check-in'}</p>
                      <p className="text-sm text-ink-secondary">
                        {i === 0 ? 'Yesterday in numbers, today\'s focus' : 'What got done, tomorrow\'s focus'}
                      </p>
                    </div>
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => {
                        const times = [...schedule.times]
                        times[i] = e.target.value
                        if (e.target.value) setSchedule({ ...schedule, times })
                      }}
                      className="rounded-full bg-black/[0.05] px-3 py-1.5 text-lg font-semibold outline-none"
                    />
                  </div>
                ))}
              </Card>
              <Card className="p-5">
                <p className="font-semibold">The price is the accountability</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{pricingRule()}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  Every unanswered call is logged. You'll always see the tally and what next month costs.
                </p>
              </Card>
              {!online && (
                <p className="text-center text-sm text-ink-secondary">
                  Calls need an account — sign in from Settings and {coach.name} will ring this phone.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {stage !== 'building' && (
        <footer className="glass fixed inset-x-0 bottom-0 border-t border-black/5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-lg items-center justify-end gap-3 px-5 pt-4">
            {stage === 'commit' && (
              <button onClick={() => setStage('plan')} className="text-sm text-accent">
                Back
              </button>
            )}
            <PrimaryButton onClick={stage === 'plan' ? () => setStage('commit') : commit} disabled={saving}>
              {stage === 'plan' ? "I'm in →" : saving ? 'Saving…' : `Deal. Ring me, ${coach.name}.`}
            </PrimaryButton>
          </div>
        </footer>
      )}
    </div>
  )
}
