/**
 * The war map: the strategic layer above the daily plan. Phases across the
 * horizon (rest of the year, or to the target date), each with an objective
 * and measurable key results, plus a board of concrete tasks. Built by the
 * coach in a draft → board-review → revise loop; the log of that loop is
 * kept so the person can see how it was reasoned.
 */
export interface KeyResult {
  id: string
  text: string
  metric?: { label: string; target: number; unit: string }
  done: boolean
}

export interface Phase {
  id: string
  name: string
  /** YYYY-MM-DD, phases are contiguous and ordered */
  start: string
  end: string
  objective: string
  keyResults: KeyResult[]
}

export type TaskStatus = 'todo' | 'doing' | 'done' | 'skipped'
export interface Task {
  id: string
  phaseId: string | null
  title: string
  detail: string
  /** YYYY-MM-DD */
  due: string | null
  status: TaskStatus
  effort: 'S' | 'M' | 'L'
  source: 'plan' | 'coach' | 'user'
  createdAt: number
  doneAt: number | null
}

export interface BuildStep {
  iteration: number
  /** the board's verdict on that draft */
  score: number
  verdict: string
  issues: string[]
}

export interface WarMap {
  version: number
  horizon: { start: string; end: string }
  northStar: string
  strategy: string
  phases: Phase[]
  risks: { risk: string; mitigation: string }[]
  buildLog: BuildStep[]
  source: 'coach' | 'local'
  generatedAt: number
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400_000)
}

/** Rest of the calendar year, extended to the target date if that's later; never shorter than 8 weeks */
export function planningHorizon(today: string, targetDate: string | undefined): { start: string; end: string } {
  const endOfYear = `${today.slice(0, 4)}-12-31`
  let end = targetDate && targetDate > endOfYear ? targetDate : endOfYear
  if (daysBetween(today, end) < 56) end = addDays(today, 56)
  return { start: today, end }
}

export function currentPhase(map: WarMap, today: string): Phase | null {
  return map.phases.find((p) => p.start <= today && today <= p.end) ?? map.phases.find((p) => p.start > today) ?? null
}

/** Board columns: what's on this week, what's after, what's finished */
export function boardColumns(tasks: Task[], today: string) {
  const weekEnd = addDays(today, 6)
  const open = tasks.filter((t) => t.status === 'todo' || t.status === 'doing')
  const byDue = (a: Task, b: Task) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt
  return {
    overdue: open.filter((t) => t.due && t.due < today).sort(byDue),
    thisWeek: open.filter((t) => t.due && t.due >= today && t.due <= weekEnd).sort(byDue),
    upNext: open.filter((t) => !t.due || t.due > weekEnd).sort(byDue),
    done: tasks.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
  }
}

export interface WarMapInput {
  statement: string
  targetDate: string
  today: string
  areaIds: string[]
  milestones: { title: string; targetDate: string; metric?: { label: string; target: number; unit: string } }[]
  obstacles: string[]
  skills: string[]
  supporters: string[]
}

const PHASE_NAMES = ['Foundations', 'Momentum', 'The push', 'Consolidate', 'Finish strong']

/** Deterministic fallback: phases between the plan's stops, generic but real tasks per phase */
export function buildLocalWarMap(input: WarMapInput): { map: WarMap; tasks: Omit<Task, 'id' | 'createdAt' | 'doneAt'>[] } {
  const horizon = planningHorizon(input.today, input.targetDate)
  const stops = input.milestones.filter((m) => m.targetDate > input.today && m.targetDate <= horizon.end)
  const bounds = [input.today, ...stops.map((s) => s.targetDate)]
  if (bounds[bounds.length - 1] !== horizon.end) bounds.push(horizon.end)
  const phases: Phase[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const stop = stops[i]
    phases.push({
      id: `p${i + 1}`,
      name: PHASE_NAMES[Math.min(i, PHASE_NAMES.length - 1)],
      start: i === 0 ? bounds[0] : addDays(bounds[i], 1),
      end: bounds[i + 1],
      objective: stop ? `Reach ${stop.title.toLowerCase()}` : `Hold the gains and finish the year strong`,
      keyResults: [
        stop
          ? { id: `kr${i + 1}a`, text: stop.title, metric: stop.metric, done: false }
          : { id: `kr${i + 1}a`, text: 'Every week reviewed on the evening call', done: false },
        { id: `kr${i + 1}b`, text: 'Both daily calls answered at least 5 days a week', done: false },
      ],
    })
  }
  const tasks: Omit<Task, 'id' | 'createdAt' | 'doneAt'>[] = [
    { phaseId: 'p1', title: 'Tell one supporter about the goal', detail: input.supporters[0] ? `Start with ${input.supporters[0]}.` : 'Saying it out loud makes it real.', due: addDays(input.today, 2), status: 'todo', effort: 'S', source: 'plan' },
    { phaseId: 'p1', title: 'Remove the easiest obstacle', detail: input.obstacles[0] ? `Make "${input.obstacles[0]}" harder to fall into this week.` : 'Pick the one that trips you most often.', due: addDays(input.today, 5), status: 'todo', effort: 'M', source: 'plan' },
    { phaseId: 'p1', title: 'Set up your tracking', detail: 'Scales, a notebook, an app — whatever you will actually use daily.', due: addDays(input.today, 3), status: 'todo', effort: 'S', source: 'plan' },
  ]
  if (input.skills[0]) tasks.push({ phaseId: 'p1', title: `Start learning: ${input.skills[0]}`, detail: 'Find one resource and do the first hour.', due: addDays(input.today, 7), status: 'todo', effort: 'M', source: 'plan' })
  phases.slice(1).forEach((p) => {
    tasks.push({ phaseId: p.id, title: `Plan ${p.name.toLowerCase()} phase with your coach`, detail: `On the evening call before ${p.start}, set the tasks for this phase.`, due: addDays(p.start, -1), status: 'todo', effort: 'S', source: 'plan' })
  })
  return {
    map: {
      version: 1,
      horizon,
      northStar: input.statement,
      strategy: `Work backwards from ${input.targetDate || horizon.end}: ${phases.length} phase${phases.length === 1 ? '' : 's'}, each ending at a stop you can see from the one before. Daily calls keep the habits; this board holds the one-off moves that make the habits stick.`,
      phases,
      risks: input.obstacles.slice(0, 3).map((o) => ({ risk: o, mitigation: 'Reduce, don\'t ban — and name it on the evening call when it bites.' })),
      buildLog: [],
      source: 'local',
      generatedAt: Date.now(),
    },
    tasks,
  }
}
