/**
 * The reverse-engineered plan. Craig: "you put in the goal and the date, and it
 * works backwards — by the inch it's a cinch." Shared so the app can build a
 * sensible plan offline and the server can have Claude build a better one.
 */
export interface Milestone {
  id: string
  title: string
  /** YYYY-MM-DD */
  targetDate: string
  /** Measurable target where the goal has a number (weight, money, minutes…) */
  metric?: { label: string; target: number; unit: string }
  why: string
}

export interface DailyAction {
  id: string
  text: string
}

export interface Roadmap {
  summary: string
  milestones: Milestone[]
  weeklyCommitments: string[]
  dailyActions: DailyAction[]
  generatedAt: number
  /** 'coach' = built by Claude; 'local' = built by the fallback below */
  source: 'coach' | 'local'
}

export interface RoadmapInput {
  statement: string
  targetDate: string
  areaId: string
  actionPlan?: string
  obstacles?: string[]
  weightKg?: number
  goalWeightKg?: number
  weightUnit?: 'stone' | 'lbs' | 'kg'
  today: string
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400_000)
}

const DEFAULT_ACTIONS: Record<string, string[]> = {
  health: ['Log everything you eat and drink', 'Move for 20 minutes', 'Weigh in (weekly is fine)'],
  wealth: ['Log every pound spent', 'One money task towards the goal'],
  career: ['One hour of focused work on the goal', 'Do one thing beyond what you were asked'],
  family: ['One undistracted conversation', 'One small kindness'],
  personal: ['Fifteen minutes of practice', 'Write down one thing you learned'],
  spirituality: ['Ten quiet minutes', 'Note one thing you were grateful for'],
  lifestyle: ['One thing purely for enjoyment', 'Plan tomorrow tonight'],
  community: ['Reach out to one person', 'Give something — time, help or thanks'],
  habits: ['Notice the urge, wait ten minutes', 'Log every slip honestly'],
  legacy: ['One step on the long-term project', 'Reflect for five minutes'],
}

/**
 * Deterministic plan: quarter → half → three-quarter → goal, evenly spaced
 * by date. Weight goals get real numbers at each stop.
 */
export function buildLocalRoadmap(input: RoadmapInput): Roadmap {
  const totalDays = Math.max(7, daysBetween(input.today, input.targetDate))
  const hasWeight = input.weightKg && input.goalWeightKg && input.goalWeightKg < input.weightKg
  const steps = totalDays > 120 ? 4 : totalDays > 45 ? 3 : totalDays > 14 ? 2 : 1
  const milestones: Milestone[] = []
  for (let i = 1; i <= steps; i++) {
    const frac = i / steps
    const date = i === steps ? input.targetDate : addDays(input.today, Math.round(totalDays * frac))
    const label = i === steps ? 'The goal' : i === 1 && steps > 1 ? 'First stop' : `Stop ${i}`
    let metric: Milestone['metric']
    let title = i === steps ? input.statement : `${Math.round(frac * 100)}% of the way`
    if (hasWeight) {
      const kg = Math.round((input.weightKg! - (input.weightKg! - input.goalWeightKg!) * frac) * 2) / 2
      metric = { label: 'Weight', target: kg, unit: 'kg' }
      title = i === steps ? 'Goal weight' : i === Math.ceil(steps / 2) ? 'Halfway' : label
    }
    milestones.push({
      id: `m${i}`,
      title,
      targetDate: date,
      metric,
      why: i === steps ? 'This is the one you wrote down.' : 'A stop you can actually see from here. By the inch it\'s a cinch.',
    })
  }
  const fromPlan = (input.actionPlan ?? '')
    .split(/\n|[,;•]|\band\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 6)
    .slice(0, 3)
  const actions = (fromPlan.length ? fromPlan : DEFAULT_ACTIONS[input.areaId] ?? DEFAULT_ACTIONS.personal)
  return {
    summary: `${totalDays} days to go, ${steps} stop${steps === 1 ? '' : 's'} along the way. We take it one stop at a time.`,
    milestones,
    weeklyCommitments: input.obstacles?.length
      ? input.obstacles.slice(0, 2).map((o) => `Cut down (not out) on: ${o}`)
      : ['Show up for both calls every day'],
    dailyActions: actions.map((text, i) => ({ id: `a${i + 1}`, text })),
    generatedAt: Date.now(),
    source: 'local',
  }
}

/** The milestone we're working towards right now (first one not yet passed), plus the one after */
export function currentMilestone(roadmap: Roadmap, today: string): { current: Milestone | null; index: number } {
  const idx = roadmap.milestones.findIndex((m) => m.targetDate >= today)
  return { current: idx === -1 ? null : roadmap.milestones[idx], index: idx }
}

/** Where a weight goal stands against the current milestone: expected vs actual */
export function weightProgress(
  roadmap: Roadmap,
  startKg: number,
  latestKg: number,
  today: string,
  startDate: string,
): { targetKg: number; expectedKg: number; aheadKg: number; daysLeft: number; status: 'ahead' | 'on track' | 'behind' } | null {
  const { current, index } = currentMilestone(roadmap, today)
  if (!current?.metric || current.metric.unit !== 'kg') return null
  const prevDate = index > 0 ? roadmap.milestones[index - 1].targetDate : startDate
  const prevKg = index > 0 ? roadmap.milestones[index - 1].metric?.target ?? startKg : startKg
  const span = Math.max(1, daysBetween(prevDate, current.targetDate))
  const elapsed = Math.min(span, Math.max(0, daysBetween(prevDate, today)))
  const expectedKg = prevKg - (prevKg - current.metric.target) * (elapsed / span)
  const aheadKg = Math.round((expectedKg - latestKg) * 10) / 10
  return {
    targetKg: current.metric.target,
    expectedKg: Math.round(expectedKg * 10) / 10,
    aheadKg,
    daysLeft: daysBetween(today, current.targetDate),
    status: aheadKg > 0.5 ? 'ahead' : aheadKg < -0.5 ? 'behind' : 'on track',
  }
}
