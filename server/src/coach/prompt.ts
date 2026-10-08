import { getCoach } from '../../shared/coaches.ts'
import { AREA_NAMES, AREA_TONE, type UserProfile, type Memory, type DaySummary, type FoodEntry, type CheckIn } from '../lib/types.ts'
import { formatWeight, halfwayKg } from '../../shared/units.ts'
import { currentMilestone, daysBetween, weightProgress } from '../../shared/roadmap.ts'
import type { User } from '../lib/repo.ts'
import type { ActionLog, WeighIn } from '../lib/types.ts'
import { boardColumns, currentPhase, type Task, type WarMap } from '../../shared/warmap.ts'
import { pounds, type AccountabilityMonth } from '../../shared/pricing.ts'
import { intakeBlock } from './intake.ts'
import { voiceBlock } from './voice.ts'
import { sharedRules } from './rules.ts'

export interface CoachContext {
  user: User
  /** A plan adjustment made overnight that the coach hasn't told them about yet */
  planUpdate?: { reason: string; coachNote: string; changes: string[] } | null
  profile: UserProfile
  memories: Memory[]
  summaries: DaySummary[]      // oldest → newest, last ~7 days
  checkIns: CheckIn[]
  todayFood: FoodEntry[]
  yesterdayFood: FoodEntry[]
  today: string                // user's local YYYY-MM-DD
  localTime: string            // user's local HH:MM
  streak: number
  weighIns: WeighIn[]
  actionLog: ActionLog[]       // last 7 days
  warmap: WarMap | null
  tasks: Task[]
  accountability: AccountabilityMonth | null
  intake: Record<string, string>
}

export function accountabilityBlock(ctx: CoachContext): string {
  const a = ctx.accountability
  if (!a || !a.scheduled) return ''
  const price = a.penaltyPence
    ? `Next month is already ${pounds(a.nextMonthPence)} because of missed calls.`
    : a.missesUntilPenalty <= 2
      ? `${a.missesUntilPenalty} more missed call${a.missesUntilPenalty === 1 ? '' : 's'} and next month's price goes up — say so plainly, once, without nagging.`
      : a.creditPence
        ? `They've earned next month's ${pounds(a.creditPence)} credit — worth a mention.`
        : ''
  return `\nCALLS THIS MONTH: ${a.answered} answered, ${a.missed} missed of ${a.scheduled} scheduled. ${price}`
}

/** The strategic layer: current phase, key results, and the board */
export function boardBlock(ctx: CoachContext): string {
  if (!ctx.warmap) return ''
  const phase = currentPhase(ctx.warmap, ctx.today)
  const cols = boardColumns(ctx.tasks, ctx.today)
  const task = (t: Task) => `- [${t.id}] ${t.title}${t.due ? ` (due ${t.due})` : ''}${t.status === 'doing' ? ' — in progress' : ''}`
  return `
THE WAR MAP (strategic plan to ${ctx.warmap.horizon.end})
North star: ${ctx.warmap.northStar}
${phase ? `Current phase: ${phase.name} (${phase.start} → ${phase.end}) — ${phase.objective}\nKey results: ${phase.keyResults.map((k) => `${k.done ? '✓' : '○'} ${k.text}`).join('; ')}` : 'No phase active.'}

THE BOARD (one-off tasks; ask about due ones, celebrate done ones, and add a task when they commit to something)
Overdue:
${cols.overdue.map(task).join('\n') || '(none)'}
This week:
${cols.thisWeek.map(task).join('\n') || '(none)'}
Up next:
${cols.upNext.slice(0, 5).map(task).join('\n') || '(none)'}
Recently done: ${cols.done.slice(0, 3).map((t) => t.title).join('; ') || '(none yet)'}`
}

/** The plan and where they stand against it — the heart of every call */
export function progressBlock(ctx: CoachContext): string {
  const { profile, today } = ctx
  const roadmap = profile.plan.roadmap
  if (!roadmap) return 'THE PLAN\n(not built yet — if they ask, tell them it\'s coming and ask what feels like a realistic first stop)'
  const unit = profile.weightUnit ?? (profile.accent === 'american' ? 'lbs' : 'stone')
  const { current, index } = currentMilestone(roadmap, today)
  const fmtMetric = (m: { label: string; target: number; unit: string }) =>
    m.unit === 'kg' ? formatWeight(m.target, unit) : `${m.target} ${m.unit}`

  const stops = roadmap.milestones
    .map((m, i) => `${i < index ? '✓' : i === index ? '→' : ' '} ${m.title} — by ${m.targetDate}${m.metric ? ` (${fmtMetric(m.metric)})` : ''}`)
    .join('\n')

  let standing = ''
  if (current && profile.weightKg) {
    const latest = ctx.weighIns.at(-1)
    const startDate = new Date(profile.createdAt).toISOString().slice(0, 10)
    const wp = latest ? weightProgress(roadmap, profile.weightKg, latest.kg, today, startDate) : null
    if (latest && wp) {
      standing = `Latest weigh-in: ${formatWeight(latest.kg, unit)} on ${latest.date}. To be on track for ${current.title} they'd be ${formatWeight(wp.expectedKg, unit)} today → they are ${wp.status}${wp.status !== 'on track' ? ` by ${formatWeight(Math.abs(wp.aheadKg), unit === 'stone' ? 'lbs' : unit)}` : ''}. ${wp.daysLeft} days to that stop.`
    } else {
      standing = `No weigh-in logged yet — ask them to hop on the scales this week. ${current ? `${daysBetween(today, current.targetDate)} days to ${current.title}.` : ''}`
    }
  } else if (current) {
    standing = `${daysBetween(today, current.targetDate)} days to ${current.title}.`
  }

  const last7 = ctx.actionLog
  const perAction = roadmap.dailyActions.map((a) => {
    const done = last7.filter((l) => l.actionId === a.id && l.done).length
    const todayDone = last7.some((l) => l.actionId === a.id && l.date === today && l.done)
    return `- [${a.id}] ${a.text} — ${done}/7 days this week${todayDone ? ', done today' : ''}`
  }).join('\n')

  const update = ctx.planUpdate
    ? `\nPLAN UPDATE YOU HAVEN'T TOLD THEM YET (do this early in the call, warmly, in your own words):\n${ctx.planUpdate.coachNote}\nChanges: ${ctx.planUpdate.changes.join('; ')}\n`
    : ''
  return `${update}THE PLAN (reverse-engineered from their goal; ${roadmap.source === 'coach' ? 'you built it' : 'a first draft'})
${roadmap.summary}
Stops:
${stops}
Where they stand: ${standing || 'no data yet'}

Weekly commitments:
${roadmap.weeklyCommitments.map((c) => `- ${c}`).join('\n')}

Daily actions (ask about these on the evening call; celebrate the ticks, ask about the gaps):
${perAction}`
}

/**
 * The persona and rules never change between requests for a given coach —
 * this block is cached. Per-user context goes in the second block.
 *
 * Three layers: who the coach is (coaches.ts), how they sound (their voice
 * guide, server/shared/voices/<id>.json via voice.ts), and how every coach
 * coaches (rules.ts). Coaches without a voice guide yet fall back to their
 * one-line style and bio.
 */
export function personaBlock(coachId: string): string {
  const coach = getCoach(coachId)
  const voice = voiceBlock(coachId)
  const identity = voice
    ? `You are ${coach.name}, a personal coach in Be More — a "gym buddy for your whole life". You check in with people every day, celebrate their wins, pick them up after bad days, and keep them moving towards the goal they chose. You're in your ${coach.ageBand}${coach.accent ? `, from ${coach.accent}` : ''}. ${coach.bio}`
    : `You are ${coach.name}, a personal coach in Be More — a "gym buddy for your whole life". You check in with people every day, celebrate their wins, pick them up after bad days, and keep them moving towards the goal they chose.\n\nYour personality: ${coach.style}, in your ${coach.ageBand}. ${coach.bio}`
  return [identity, voice, sharedRules(coach.name)].filter(Boolean).join('\n\n')
}

export function contextBlock(ctx: CoachContext): string {
  const { profile, user } = ctx
  const areaIds = profile.areaIds?.length ? profile.areaIds : [profile.areaId]
  const area = areaIds.length > 1
    ? `${AREA_NAMES[areaIds[0]]} (main focus), plus ${areaIds.slice(1).map((a) => AREA_NAMES[a]).join(', ')}`
    : AREA_NAMES[profile.areaId]
  const unit = profile.weightUnit ?? (profile.accent === 'american' ? 'lbs' : 'stone')
  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '(none listed)')

  const health = profile.areaId === 'health' && profile.weightKg
    ? [
        `Current weight: ${formatWeight(profile.weightKg, unit)}`,
        profile.goalWeightKg ? `Goal weight: ${formatWeight(profile.goalWeightKg, unit)}` : '',
        profile.goalWeightKg ? `Halfway milestone: ${formatWeight(halfwayKg(profile.weightKg, profile.goalWeightKg), unit)}${profile.plan.milestone ? ` ("${profile.plan.milestone}")` : ''}` : '',
        profile.calorieTarget ? `Daily calorie target: ${profile.calorieTarget} kcal` : '',
      ].filter(Boolean).join('\n')
    : ''

  const kcal = (entries: FoodEntry[]) => {
    const eaten = entries.filter((f) => f.kind === 'food').reduce((s, f) => s + f.calories, 0)
    const burned = entries.filter((f) => f.kind === 'exercise').reduce((s, f) => s + Math.abs(f.calories), 0)
    return entries.length ? `${eaten} kcal eaten, ${burned} kcal burned (${entries.map((f) => f.label).join(', ')})` : 'nothing logged'
  }

  const memories = ctx.memories.length
    ? ctx.memories.map((m) => `- [${m.kind}] ${m.text}`).join('\n')
    : '(nothing yet — this is early days, ask and listen)'

  const days = ctx.summaries.length
    ? ctx.summaries.map((s) => `${s.date}: ${s.summary}${s.tomorrowFocus ? ` → focus: ${s.tomorrowFocus}` : ''}`).join('\n')
    : '(no day summaries yet)'

  const recentCheckIns = ctx.checkIns.slice(-5)
    .map((c) => `${c.date}: ${c.wentWell ? 'good day' : 'tough day'}${c.note ? ` — "${c.note}"` : ''}`)
    .join('\n')

  return `THE PERSON YOU ARE COACHING
Name: ${profile.name}
Local time now: ${ctx.localTime} on ${ctx.today} (${user.timezone})
Life areas: ${area}
Tone for the main focus: ${AREA_TONE[profile.areaId]}${areaIds.length > 1 ? `\nAlso weave in the other areas across the week — a question about each every few days. Tones: ${areaIds.slice(1).map((a) => `${AREA_NAMES[a]}: ${AREA_TONE[a]}`).join(' | ')}` : ''}
Their goal: ${profile.plan.statement}${profile.plan.targetDate ? `\nTarget date: ${profile.plan.targetDate}` : ''}
Streak: ${ctx.streak} day${ctx.streak === 1 ? '' : 's'} of check-ins
${health}

What's in it for them (their own words — remind them on hard days):
${list(profile.plan.benefits)}

Obstacles they predicted (watch for these; reduce, don't ban):
${list(profile.plan.obstacles)}

Supporters: ${profile.plan.supporters.join(', ') || '(none listed)'}
Skills they're building: ${profile.plan.skills.join(', ') || '(none listed)'}
${profile.plan.actionPlan ? `Their action plan: ${profile.plan.actionPlan}` : ''}

${intakeBlock(ctx.intake)}

WHAT YOU REMEMBER ABOUT THEM (long-term memory, most important first)
${memories}

RECENT DAYS
${days}

Recent check-ins:
${recentCheckIns || '(none yet)'}

Yesterday's food log: ${kcal(ctx.yesterdayFood)}
Today's food log so far: ${kcal(ctx.todayFood)}

${progressBlock(ctx)}
${boardBlock(ctx)}${accountabilityBlock(ctx)}`
}
