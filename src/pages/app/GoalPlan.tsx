import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { getArea } from '../../data/goalAreas'
import { getCoach } from '../../data/coaches'
import { api } from '../../lib/api'
import { Card, Rise } from '../../components/ui'
import { DailyActions, RoadmapTimeline, WeightStanding } from '../../components/Roadmap'

export default function GoalPlan() {
  const { state, online, setRoadmap } = useStore()
  const profile = state.profile!
  const area = getArea(profile.areaId)
  const coach = getCoach(profile.coachId)
  const roadmap = profile.plan.roadmap
  const [rebuilding, setRebuilding] = useState(false)

  const rebuild = async () => {
    setRebuilding(true)
    try {
      setRoadmap(await api.coach.roadmap())
    } finally {
      setRebuilding(false)
    }
  }

  const progress = useMemo(() => {
    const start = profile.createdAt
    const end = new Date(profile.plan.targetDate).getTime()
    if (!profile.plan.targetDate || end <= start) return null
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
  }, [profile.createdAt, profile.plan.targetDate])

  const sections: { title: string; icon: string; items: string[] }[] = [
    { title: 'What’s in it for you', icon: '💎', items: profile.plan.benefits },
    { title: 'Obstacles to overcome', icon: '🧗', items: profile.plan.obstacles },
    { title: 'People & groups helping you', icon: '🤝', items: profile.plan.supporters },
    { title: 'Skills & knowledge to learn', icon: '🧠', items: profile.plan.skills },
  ]

  return (
    <div className="space-y-5">
      <Rise>
        <h1 className="display-tight text-3xl font-semibold">Your goal.</h1>
        <p className="mt-1 text-ink-secondary">The plan {coach.name} works you towards, call by call.</p>
      </Rise>

      <Rise delay={0.05}>
        <div className={`rounded-3xl bg-gradient-to-br ${area.gradient} p-6 text-white shadow-card`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {area.icon} {area.name}
          </p>
          <p className="mt-2 text-xl font-semibold leading-snug">{profile.plan.statement}</p>
          {profile.plan.targetDate && (
            <p className="mt-3 text-sm opacity-90">
              🎯 Target:{' '}
              {new Date(profile.plan.targetDate).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
          {progress !== null && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </Rise>

      {roadmap ? (
        <>
          <Rise delay={0.08}>
            <WeightStanding roadmap={roadmap} />
          </Rise>
          <Rise delay={0.1}>
            <DailyActions roadmap={roadmap} />
          </Rise>
          <Rise delay={0.12}>
            <Card className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-semibold">The stops</h2>
                {online && (
                  <button onClick={rebuild} disabled={rebuilding} className="text-sm text-accent disabled:opacity-40">
                    {rebuilding ? 'Rebuilding…' : 'Rebuild plan'}
                  </button>
                )}
              </div>
              <p className="mb-4 text-[15px] leading-relaxed text-ink-secondary">{roadmap.summary}</p>
              <RoadmapTimeline roadmap={roadmap} />
            </Card>
          </Rise>
          <Rise delay={0.14}>
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
          </Rise>
        </>
      ) : (
        <Rise delay={0.08}>
          <Card className="p-5">
            <p className="font-semibold">No plan yet</p>
            <p className="mt-1 text-sm text-ink-secondary">{coach.name} can reverse-engineer your goal into dated stops and daily actions.</p>
            <Link to="/app/plan" className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">
              Build my plan
            </Link>
          </Card>
        </Rise>
      )}

      {sections
        .filter((s) => s.items.length > 0)
        .map((s, i) => (
          <Rise key={s.title} delay={0.1 + i * 0.05}>
            <Card className="p-5">
              <h2 className="font-semibold">
                {s.icon} {s.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[15px] leading-relaxed">
                    <span className="mt-0.5 text-leaf">✓</span> {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Rise>
        ))}

      {profile.plan.actionPlan && (
        <Rise delay={0.3}>
          <Card className="p-5">
            <h2 className="font-semibold">🗺️ Plan of action</h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-secondary">
              {profile.plan.actionPlan}
            </p>
          </Card>
        </Rise>
      )}

      <Rise delay={0.35}>
        <Card className="bg-ink p-5 text-white">
          <p className="text-[15px] font-medium leading-relaxed">
            “Set a target date. Without one, it’s simply a dream or a wish — and it will never
            happen.”
          </p>
        </Card>
      </Rise>
    </div>
  )
}
