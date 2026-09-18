import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from './client.ts'
import { personaBlock, contextBlock } from './prompt.ts'
import { buildContext } from './context.ts'
import { currentMilestone, daysBetween, weightProgress, type Roadmap } from '../../../shared/roadmap.ts'
import { formatWeight } from '../../../shared/units.ts'
import { localParts, shiftDate } from '../lib/time.ts'
import * as repo from '../lib/repo.ts'

/**
 * Adaptive re-planning. Runs in the background each night: looks at where
 * the person actually is against the plan and decides whether to keep it or
 * adjust it — tighter or looser daily actions, a nearer stop when they're
 * behind, a stop pulled forward when they're ahead. Every change is logged
 * and explained on the next morning call. The goal date itself moves only
 * as a last resort, and the coach says so.
 */

export interface Standing {
  daysToStop: number | null
  weight: ReturnType<typeof weightProgress>
  /** share of daily-action slots ticked over the last 7 logged days, 0-1; null when nothing logged */
  actionRate: number | null
  daysWithData: number
  missedCalls7d: number
  daysSinceReview: number
}

export function assessStanding(user: repo.User, today: string): Standing | null {
  const p = user.profile
  const roadmap = p?.plan.roadmap
  if (!p || !roadmap) return null
  const { current } = currentMilestone(roadmap, today)
  const weighIns = repo.listWeighIns(user.id)
  const latest = weighIns.at(-1)
  const startDate = new Date(p.createdAt).toISOString().slice(0, 10)
  const weight = latest && p.weightKg ? weightProgress(roadmap, p.weightKg, latest.kg, today, startDate) : null

  const log = repo.listActionLog(user.id, shiftDate(today, -6))
  const daysWithData = new Set(log.map((l) => l.date)).size
  const slots = daysWithData * roadmap.dailyActions.length
  const done = log.filter((l) => l.done).length
  const actionRate = slots ? done / slots : null

  const deliveries = repo.listDeliveries(user.id, 40).filter((d) => d.date >= shiftDate(today, -6) && d.kind !== 'manual')
  const missedCalls7d = deliveries.filter((d) => d.status === 'missed').length

  const lastReview = repo.listReviews(user.id, 1)[0]
  const since = lastReview ? lastReview.date : new Date(roadmap.generatedAt).toISOString().slice(0, 10)

  return {
    daysToStop: current ? daysBetween(today, current.targetDate) : null,
    weight,
    actionRate,
    daysWithData,
    missedCalls7d,
    daysSinceReview: daysBetween(since, today),
  }
}

/** Should the nightly job review this person tonight? */
export function reviewTrigger(s: Standing): 'weekly' | 'behind' | null {
  if (s.daysSinceReview >= 7) return 'weekly'
  const behindOnWeight = s.weight?.status === 'behind' && s.weight.aheadKg <= -1
  const behindOnActions = s.actionRate !== null && s.daysWithData >= 3 && s.actionRate < 0.4
  if ((behindOnWeight || behindOnActions) && s.daysSinceReview >= 3) return 'behind'
  return null
}

const ReviewOut = z.object({
  decision: z.enum(['keep', 'adjust']),
  reason: z.string().describe('One or two sentences, plain, for the person to read on their Goal page'),
  coachNote: z.string().describe('What you will say about this on the next morning call: 2-3 spoken sentences. Positive, specific, no blame. Empty string if keeping the plan.'),
  changes: z.array(z.string()).describe('Human-readable list of what changed, e.g. "Moved first stop to 5 Dec". Empty if keeping.'),
  roadmap: z.object({
    summary: z.string(),
    milestones: z.array(z.object({
      title: z.string(),
      targetDate: z.string(),
      metric: z.object({ label: z.string(), target: z.number(), unit: z.string() }).nullable(),
      why: z.string(),
    })).min(1).max(6),
    weeklyCommitments: z.array(z.string()).min(1).max(4),
    dailyActions: z.array(z.string()).min(2).max(4),
  }).nullable().describe('The full revised plan when adjusting; null when keeping'),
})

export async function reviewPlan(user: repo.User, trigger: 'weekly' | 'behind' | 'manual'): Promise<repo.PlanReview> {
  const p = user.profile!
  const { date: today } = localParts(user.timezone)
  const roadmap = p.plan.roadmap!
  const standing = assessStanding(user, today)!
  const ctx = buildContext(user)
  const unit = p.weightUnit ?? (p.accent === 'american' ? 'lbs' : 'stone')

  let out: z.infer<typeof ReviewOut>
  try {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(ReviewOut) },
      system: [
        { type: 'text', text: personaBlock(p.coachId), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: contextBlock(ctx) },
      ],
      messages: [{
        role: 'user',
        content: `NIGHTLY PLAN REVIEW (${trigger}). Today is ${today}. Decide whether ${p.name}'s plan should stay or change.

Standing:
- Days to current stop: ${standing.daysToStop ?? 'n/a'}
- Weight vs plan: ${standing.weight ? `${standing.weight.status} by ${formatWeight(Math.abs(standing.weight.aheadKg), unit === 'stone' ? 'lbs' : unit)} (expected ${formatWeight(standing.weight.expectedKg, unit)})` : 'no weigh-ins'}
- Daily actions ticked: ${standing.actionRate === null ? 'nothing logged' : `${Math.round(standing.actionRate * 100)}% over ${standing.daysWithData} days`}
- Calls missed this week: ${standing.missedCalls7d}

Rules:
- Keep the plan unless a change will genuinely help. Small, specific changes beat big ones.
- Behind: make the next stop nearer and smaller (by the inch it's a cinch), and swap the least-kept daily action for an easier version. Do NOT move the final goal date unless they are so far behind it's unrealistic — and if you must, say so plainly in the reason.
- Ahead: celebrate; optionally pull the next stop forward or add one modest action.
- Not logging anything: don't punish — simplify to two actions and make one of them "tell me how the day went on the evening call".
- Missing calls: keep the plan, note it in the coachNote gently, and ask on the call whether the times still suit.
- Milestone dates strictly increasing, all after today; metric unit for weight is kg.

Current plan: ${JSON.stringify({ summary: roadmap.summary, milestones: roadmap.milestones, weeklyCommitments: roadmap.weeklyCommitments, dailyActions: roadmap.dailyActions })}`,
      }],
    })
    out = response.parsed_output ?? localReview(roadmap, standing, today)
  } catch (err) {
    console.warn('[review] Claude unavailable, using local rules:', (err as Error).message)
    out = localReview(roadmap, standing, today)
  }

  if (out.decision === 'adjust' && out.roadmap) {
    const revised: Roadmap = {
      summary: out.roadmap.summary,
      milestones: out.roadmap.milestones.map((m, i) => ({ id: `m${i + 1}`, title: m.title, targetDate: m.targetDate, metric: m.metric ?? undefined, why: m.why })),
      weeklyCommitments: out.roadmap.weeklyCommitments,
      dailyActions: out.roadmap.dailyActions.map((text, i) => {
        // keep ids stable for unchanged actions so their tick history survives
        const existing = roadmap.dailyActions.find((a) => a.text === text)
        return { id: existing?.id ?? `a${i + 1}-${today.replace(/-/g, '')}`, text }
      }),
      generatedAt: Date.now(),
      source: roadmap.source,
    }
    repo.saveProfile(user.id, { ...p, plan: { ...p.plan, roadmap: revised } })
  }

  return repo.addReview(user.id, {
    date: today,
    trigger,
    decision: out.decision,
    reason: out.reason,
    coachNote: out.coachNote,
    changes: out.changes,
  })
}

/** Rule-based fallback when Claude is unavailable: nearer stop when behind, simpler actions when not logging */
export function localReview(roadmap: Roadmap, s: Standing, today: string): z.infer<typeof ReviewOut> {
  const plain = { summary: roadmap.summary, milestones: roadmap.milestones.map((m) => ({ title: m.title, targetDate: m.targetDate, metric: m.metric ?? null, why: m.why })), weeklyCommitments: roadmap.weeklyCommitments, dailyActions: roadmap.dailyActions.map((a) => a.text) }
  const { current, index } = currentMilestone(roadmap, today)
  const changes: string[] = []

  if (s.weight?.status === 'behind' && current?.metric && s.daysToStop && s.daysToStop > 14) {
    // Insert a nearer, smaller stop halfway to the current one
    const halfDays = Math.round(s.daysToStop / 2)
    const halfDate = shiftDate(today, halfDays)
    const prevKg = index > 0 ? roadmap.milestones[index - 1].metric?.target ?? s.weight.expectedKg : s.weight.expectedKg
    const midKg = Math.round(((s.weight.expectedKg + current.metric.target) / 2) * 2) / 2
    plain.milestones.splice(index, 0, { title: 'Nearer stop', targetDate: halfDate, metric: { label: 'Weight', target: Math.min(midKg, prevKg), unit: 'kg' }, why: 'A smaller step you can hit from where you are now.' })
    changes.push(`Added a nearer stop on ${halfDate}`)
  }
  if (s.actionRate !== null && s.daysWithData >= 3 && s.actionRate < 0.4 && plain.dailyActions.length > 2) {
    plain.dailyActions = plain.dailyActions.slice(0, 2)
    changes.push('Simplified to two daily actions')
  }
  if (!changes.length) {
    return { decision: 'keep', reason: 'Plan reviewed — on course, no changes.', coachNote: '', changes: [], roadmap: null }
  }
  return {
    decision: 'adjust',
    reason: `Reviewed against this week: ${changes.join('; ').toLowerCase()}.`,
    coachNote: `Quick one: I've had a look at the plan overnight and made it a bit easier to hit from where you are — ${changes.join(' and ').toLowerCase()}. Stepping stone, not a stopping stone.`,
    changes,
    roadmap: plain,
  }
}
