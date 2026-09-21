import { z } from 'zod'
import { completeJson } from './llm.ts'
import { personaBlock } from './prompt.ts'
import { buildLocalWarMap, planningHorizon, type BuildStep, type Task, type WarMap } from '../../shared/warmap.ts'
import { formatWeight } from '../../shared/units.ts'
import { localParts } from '../lib/time.ts'
import { AREA_NAMES } from '../lib/types.ts'
import * as repo from '../lib/repo.ts'

/**
 * The strategic planner. A self-critical loop:
 *   1. draft the war map (phases, key results, tasks)
 *   2. a "board" reviews it hard: reverse-engineered? measurable? first two
 *      weeks concrete? realistic against the obstacles? — scores it /10
 *   3. revise against the critique
 * …until the board is satisfied (≥ 8) or three rounds are up. Every round is
 * logged so the person can see how their plan was reasoned.
 */

const Metric = z.object({ label: z.string(), target: z.number(), unit: z.string() }).nullable()
const Draft = z.object({
  northStar: z.string().describe('The goal restated as a vivid outcome on the horizon date, one sentence'),
  strategy: z.string().describe('3-5 sentences: the theory of how we get there, in the coach\'s voice'),
  phases: z.array(z.object({
    name: z.string().describe('Two or three words'),
    start: z.string(),
    end: z.string(),
    objective: z.string(),
    keyResults: z.array(z.object({ text: z.string(), metric: Metric })).min(1).max(3),
  })).min(2).max(6).describe('Contiguous, ordered, covering the whole horizon. Phase ends should line up with the plan\'s stops.'),
  tasks: z.array(z.object({
    phase: z.number().int().describe('1-based index of the phase'),
    title: z.string().describe('Imperative, under 10 words'),
    detail: z.string().describe('One sentence: how, or why it matters'),
    due: z.string().nullable().describe('YYYY-MM-DD, or null if any time in the phase'),
    effort: z.enum(['S', 'M', 'L']),
  })).min(6).max(24).describe('One-off moves, not daily habits. At least 4 in the first two weeks, each concrete enough to tick.'),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })).min(1).max(5),
})
type DraftT = z.infer<typeof Draft>

const Review = z.object({
  score: z.number().int().min(1).max(10),
  verdict: z.string().describe('Two sentences, blunt'),
  issues: z.array(z.string()).max(8).describe('Specific, fixable problems. Empty if the plan is ready.'),
})

type ReviewT = z.infer<typeof Review>

const MAX_ROUNDS = 3
const PASS_SCORE = 8

function situation(user: repo.User, today: string): string {
  const p = user.profile!
  const unit = p.weightUnit ?? (p.accent === 'american' ? 'lbs' : 'stone')
  const areas = (p.areaIds?.length ? p.areaIds : [p.areaId]).map((a, i) => `${AREA_NAMES[a]}${i === 0 ? ' (main focus)' : ''}`).join(', ')
  const horizon = planningHorizon(today, p.plan.targetDate)
  const memories = repo.listMemories(user.id).slice(0, 15).map((m) => `- ${m.text}`).join('\n')
  return `Today: ${today}. Planning horizon: ${horizon.start} → ${horizon.end} (the rest of the year${p.plan.targetDate > horizon.end ? '' : ', past the target date'}).
Name: ${p.name}
Life areas: ${areas}
Goal: ${p.plan.statement}
Target date: ${p.plan.targetDate || '(none set — use the horizon end)'}
${p.weightKg ? `Current weight ${formatWeight(p.weightKg, unit)}${p.goalWeightKg ? `, goal ${formatWeight(p.goalWeightKg, unit)}` : ''} (metrics in kg internally)` : ''}
Benefits they want: ${p.plan.benefits.join('; ') || '(none)'}
Obstacles: ${p.plan.obstacles.join('; ') || '(none)'}
Supporters: ${p.plan.supporters.join('; ') || '(none)'}
Skills to build: ${p.plan.skills.join('; ') || '(none)'}
Their own action plan: ${p.plan.actionPlan || '(none)'}
Daily plan already in place (stops): ${p.plan.roadmap ? p.plan.roadmap.milestones.map((m) => `${m.title} by ${m.targetDate}`).join('; ') : '(none yet)'}
Daily actions already in place: ${p.plan.roadmap?.dailyActions.map((a) => a.text).join('; ') || '(none)'}
What the coach remembers about them:
${memories || '(nothing yet)'}`
}

/** Build (or rebuild) the war map. Long-running: updates progress in the DB as it goes. */
export async function buildWarMap(user: repo.User): Promise<{ map: WarMap; tasks: Task[] }> {
  const p = user.profile!
  const { date: today } = localParts(user.timezone)
  repo.setWarMapStatus(user.id, 'building', 'Drafting the map')

  const local = buildLocalWarMap({
    statement: p.plan.statement,
    targetDate: p.plan.targetDate,
    today,
    areaIds: p.areaIds?.length ? p.areaIds : [p.areaId],
    milestones: p.plan.roadmap?.milestones ?? [],
    obstacles: p.plan.obstacles,
    skills: p.plan.skills,
    supporters: p.plan.supporters,
  })

  let draft: DraftT | null = null
  const log: BuildStep[] = []
  try {
    const sys = [personaBlock(p.coachId), situation(user, today)]
    const first: DraftT | null = await completeJson({
      schema: Draft, name: 'war_map_draft', maxTokens: 8192, effort: 'medium',
      system: sys,
      messages: [{ role: 'user', content: `Build ${p.name}'s war map for the horizon: work backwards from the outcome, phase by phase, then the concrete one-off tasks that make each phase happen. Phases must line up with the existing stops where there are any. Tasks are moves (book, buy, tell, set up, clear out, learn, decide), not habits — the daily actions already cover habits. The first two weeks must be specific enough to start tomorrow.` }],
    })
    if (!first) throw new Error('no draft')
    draft = first

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      repo.setWarMapStatus(user.id, 'building', round === 1 ? 'The board is reviewing the draft' : `Board review, round ${round}`)
      const review: ReviewT | null = await completeJson({
        schema: Review, name: 'board_review', maxTokens: 2048, effort: 'medium',
        system: [`You are the board reviewing a personal strategic plan before it goes to the person. Be blunt and specific. Score 1-10. A 10 means: (1) genuinely reverse-engineered from the goal and date — each phase is a necessary step to the next, not filler; (2) every key result is measurable or checkable; (3) the first two weeks are concrete enough to start tomorrow; (4) it takes the stated obstacles seriously with reduce-not-ban tactics; (5) phases are contiguous and cover the whole horizon; (6) tasks are one-off moves with sensible dates, not vague habits; (7) it would not overwhelm a normal person with a job. Fewer than 8 means it must be revised.\n\n${situation(user, today)}`],
        messages: [{ role: 'user', content: `DRAFT ${round}\n${JSON.stringify(draft)}` }],
      })
      if (!review) break
      log.push({ iteration: round, score: review.score, verdict: review.verdict, issues: review.issues })
      if (review.score >= PASS_SCORE || round === MAX_ROUNDS) break

      repo.setWarMapStatus(user.id, 'building', `Revising after the board's notes (round ${round})`)
      const revised: DraftT | null = await completeJson({
        schema: Draft, name: 'war_map_revision', maxTokens: 8192, effort: 'medium',
        system: sys,
        messages: [{ role: 'user', content: `Revise the war map to fix every issue the board raised. Keep what worked.\n\nBOARD VERDICT (${review.score}/10): ${review.verdict}\nISSUES:\n${review.issues.map((i) => `- ${i}`).join('\n')}\n\nCURRENT DRAFT:\n${JSON.stringify(draft)}` }],
      })
      if (revised) draft = revised
    }
  } catch (err) {
    console.warn('[warmap] Claude unavailable, using local map:', (err as Error).message)
    draft = null
  }

  let map: WarMap
  let tasks: Omit<Task, 'id' | 'createdAt' | 'doneAt'>[]
  if (draft) {
    const phases = draft.phases.map((ph, i) => ({
      id: `p${i + 1}`, name: ph.name, start: ph.start, end: ph.end, objective: ph.objective,
      keyResults: ph.keyResults.map((k, j) => ({ id: `kr${i + 1}${String.fromCharCode(97 + j)}`, text: k.text, metric: k.metric ?? undefined, done: false })),
    }))
    map = {
      version: (repo.getWarMap(user.id).map?.version ?? 0) + 1,
      horizon: planningHorizon(today, p.plan.targetDate),
      northStar: draft.northStar, strategy: draft.strategy, phases, risks: draft.risks,
      buildLog: log, source: 'coach', generatedAt: Date.now(),
    }
    tasks = draft.tasks.map((t) => ({
      phaseId: phases[Math.min(Math.max(t.phase, 1), phases.length) - 1].id,
      title: t.title, detail: t.detail, due: t.due, status: 'todo', effort: t.effort, source: 'plan',
    }))
  } else {
    map = { ...local.map, version: (repo.getWarMap(user.id).map?.version ?? 0) + 1 }
    tasks = local.tasks
  }

  repo.replacePlanTasks(user.id, tasks)
  repo.saveWarMap(user.id, map)
  return { map, tasks: repo.listTasks(user.id) }
}

/** Kick off a build without waiting; the app polls GET /coach/warmap */
const inFlight = new Set<string>()
let autoBuild = true
/** Tests: stop background builds from consuming stubbed responses */
export function setAutoBuild(on: boolean) {
  autoBuild = on
}
export function buildWarMapInBackground(user: repo.User) {
  if (!autoBuild || inFlight.has(user.id)) return
  inFlight.add(user.id)
  buildWarMap(user)
    .catch((err) => {
      console.error('[warmap] build failed', user.id, err)
      repo.setWarMapStatus(user.id, 'failed', (err as Error).message)
    })
    .finally(() => inFlight.delete(user.id))
}
