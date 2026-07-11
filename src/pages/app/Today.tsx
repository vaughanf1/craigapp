import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { currentStreak, todayKey, uid, useStore } from '../../lib/store'
import { getCoach } from '../../data/coaches'
import { getArea } from '../../data/goalAreas'
import {
  dailyMotivation,
  dailyQuestion,
  greeting,
  morningKickoff,
  speak,
  streakPraise,
  supportiveStatement,
  understandingResponse,
} from '../../lib/coach'
import { COMMON_EXERCISE, COMMON_FOODS } from '../../data/calories'
import { Card, CoachAvatar, Rise } from '../../components/ui'
import type { FoodEntry } from '../../lib/types'

export default function Today() {
  const { state, addCheckIn, addFood, removeFood, addChat } = useStore()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)
  const area = getArea(profile.areaId)

  const today = todayKey()
  const todaysCheckIn = state.checkIns.find((c) => c.date === today)
  const streak = currentStreak(state.checkIns)
  const [note, setNote] = useState('')
  const [reaction, setReaction] = useState<string | null>(null)

  const daysToTarget = useMemo(() => {
    if (!profile.plan.targetDate) return null
    const diff = new Date(profile.plan.targetDate).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86_400_000))
  }, [profile.plan.targetDate])

  const checkIn = (wentWell: boolean) => {
    addCheckIn({ date: today, wentWell, note })
    const response = wentWell
      ? `${supportiveStatement(profile.areaId)} That's ${streak + 1} ${streak + 1 === 1 ? 'day' : 'days'} of showing up.`
      : understandingResponse()
    setReaction(response)
    addChat({ id: uid(), from: 'coach', text: response, timestamp: Date.now() })
    if (profile.voiceEnabled) speak(response, profile.accent, coach.gender)
    setNote('')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Rise>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="display-tight text-3xl font-semibold">{greeting(profile.name)}</h1>
            <p className="mt-1 text-ink-secondary">{morningKickoff(profile.areaId)}</p>
          </div>
          <Link to="/app/coach">
            <CoachAvatar coach={coach} size="md" />
          </Link>
        </div>
      </Rise>

      {/* Streak + countdown */}
      <Rise delay={0.05}>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-4xl font-semibold">
              {streak}
              <span className="ml-1 text-lg">🔥</span>
            </p>
            <p className="mt-1 text-sm text-ink-secondary">day streak</p>
          </Card>
          <Card className="p-5">
            <p className="text-4xl font-semibold">{daysToTarget ?? '—'}</p>
            <p className="mt-1 text-sm text-ink-secondary">days to target</p>
          </Card>
        </div>
      </Rise>

      {/* Goal banner */}
      <Rise delay={0.1}>
        <div className={`rounded-3xl bg-gradient-to-br ${area.gradient} p-5 text-white shadow-card`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {area.icon} {area.name}
          </p>
          <p className="mt-1.5 text-lg font-medium leading-snug">{profile.plan.statement}</p>
        </div>
      </Rise>

      {/* Daily check-in */}
      <Rise delay={0.15}>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <CoachAvatar coach={coach} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{coach.name}</p>
              {todaysCheckIn ? (
                <div>
                  <p className="mt-1 leading-relaxed">
                    {reaction ?? streakPraise(profile.name, streak, profile.areaId)}
                  </p>
                  <p className="mt-2 text-sm text-ink-secondary">
                    ✓ Checked in today {todaysCheckIn.wentWell ? '— a good day!' : '— tomorrow is a clean page.'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mt-1 leading-relaxed">{dailyQuestion(profile.areaId)}</p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tell your coach how it went… (optional)"
                    rows={2}
                    className="mt-3 w-full resize-none rounded-2xl bg-black/[0.04] px-3.5 py-2.5 text-[15px] outline-none ring-accent/50 focus:ring-2"
                  />
                  <div className="mt-3 flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => checkIn(true)}
                      className="flex-1 rounded-full bg-accent py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      Went well 💪
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => checkIn(false)}
                      className="flex-1 rounded-full bg-black/[0.05] py-2.5 font-medium transition-colors hover:bg-black/[0.08]"
                    >
                      Tough day
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </Rise>

      {/* Calorie tracker for health goals */}
      {profile.areaId === 'health' && <CalorieCard addFood={addFood} removeFood={removeFood} />}

      {/* Daily motivation */}
      <Rise delay={0.2}>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Today’s motivation
          </p>
          <p className="mt-2 text-lg font-medium leading-snug">“{dailyMotivation()}”</p>
        </Card>
      </Rise>

      {/* Benefits reminder — "what's in it for you" resurfaced daily */}
      {profile.plan.benefits.length > 0 && (
        <Rise delay={0.25}>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Remember what’s waiting for you
            </p>
            <ul className="mt-2 space-y-1.5">
              {profile.plan.benefits.slice(0, 4).map((b) => (
                <li key={b} className="flex items-center gap-2 text-[15px]">
                  <span className="text-leaf">✓</span> {b}
                </li>
              ))}
            </ul>
          </Card>
        </Rise>
      )}
    </div>
  )
}

function CalorieCard({
  addFood,
  removeFood,
}: {
  addFood: (f: FoodEntry) => void
  removeFood: (id: string) => void
}) {
  const { state } = useStore()
  const profile = state.profile!
  const [label, setLabel] = useState('')
  const [calories, setCalories] = useState('')
  const [kind, setKind] = useState<'food' | 'exercise'>('food')
  const [showQuick, setShowQuick] = useState(false)

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const todays = state.foodLog.filter((f) => f.timestamp >= start.getTime())
  const eaten = todays.filter((f) => f.kind === 'food').reduce((s, f) => s + f.calories, 0)
  const burned = todays.filter((f) => f.kind === 'exercise').reduce((s, f) => s + f.calories, 0)
  const net = eaten - burned
  const target = profile.calorieTarget ?? 2000

  const add = (l: string, c: number, k: 'food' | 'exercise') => {
    if (!l.trim() || !c) return
    addFood({ id: uid(), label: l.trim(), calories: c, kind: k, timestamp: Date.now() })
    setLabel('')
    setCalories('')
  }

  const quickList = kind === 'food' ? COMMON_FOODS : COMMON_EXERCISE

  return (
    <Rise delay={0.18}>
      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Calories today
          </p>
          <p className="text-sm text-ink-secondary">
            🍽️ {eaten} − 🏃 {burned} ={' '}
            <span className={`font-semibold ${net > target ? 'text-coral' : 'text-leaf'}`}>{net}</span>{' '}
            / {target}
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              net > target ? 'bg-coral' : 'bg-gradient-to-r from-leaf to-mint'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, (net / target) * 100))}%` }}
          />
        </div>

        <div className="mt-4 flex gap-2">
          {(['food', 'exercise'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                kind === k ? 'bg-ink text-white' : 'bg-black/[0.05] text-ink-secondary'
              }`}
            >
              {k === 'food' ? '🍽️ Food' : '🏃 Exercise'}
            </button>
          ))}
          <button
            onClick={() => setShowQuick((s) => !s)}
            className="ml-auto rounded-full bg-black/[0.05] px-4 py-1.5 text-sm font-medium text-accent"
          >
            {showQuick ? 'Hide' : 'Quick add'}
          </button>
        </div>

        {showQuick && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {quickList.map((q) => (
              <button
                key={q.label}
                onClick={() => add(q.label, q.calories, kind)}
                className="shrink-0 rounded-2xl bg-black/[0.04] px-3 py-2 text-left text-xs transition-colors hover:bg-black/[0.08]"
              >
                <p className="font-medium">{q.label}</p>
                <p className="text-ink-secondary">{q.calories} kcal</p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={kind === 'food' ? 'What did you eat?' : 'What exercise did you do?'}
            className="min-w-0 flex-1 rounded-2xl bg-black/[0.04] px-3.5 py-2.5 text-[15px] outline-none ring-accent/50 focus:ring-2"
          />
          <input
            value={calories}
            onChange={(e) => setCalories(e.target.value.replace(/\D/g, ''))}
            placeholder="kcal"
            inputMode="numeric"
            className="w-20 rounded-2xl bg-black/[0.04] px-3 py-2.5 text-[15px] outline-none ring-accent/50 focus:ring-2"
          />
          <button
            onClick={() => add(label, Number(calories), kind)}
            disabled={!label.trim() || !calories}
            className="rounded-2xl bg-accent px-4 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            +
          </button>
        </div>

        {todays.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {todays
              .slice()
              .reverse()
              .map((f) => (
                <li key={f.id} className="flex items-center justify-between text-sm">
                  <span>
                    {f.kind === 'food' ? '🍽️' : '🏃'} {f.label}
                  </span>
                  <span className="flex items-center gap-2 text-ink-secondary">
                    {f.kind === 'exercise' ? '−' : ''}
                    {f.calories} kcal
                    <button
                      onClick={() => removeFood(f.id)}
                      className="text-ink-secondary/50 hover:text-coral"
                      aria-label={`Remove ${f.label}`}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </Rise>
  )
}
