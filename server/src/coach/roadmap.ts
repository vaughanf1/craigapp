import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from './client.ts'
import { personaBlock } from './prompt.ts'
import { buildLocalRoadmap, type Roadmap } from '../../shared/roadmap.ts'
import { formatWeight } from '../../shared/units.ts'
import { localParts } from '../lib/time.ts'
import { AREA_NAMES } from '../lib/types.ts'
import * as repo from '../lib/repo.ts'

/**
 * Reverse-engineer the goal: from "11 stone by June" to dated stops, weekly
 * commitments and daily actions the calls can hold them to. Claude builds
 * it; if Claude is unavailable the deterministic local plan stands in.
 */
const RoadmapOut = z.object({
  summary: z.string().describe('Two sentences, in the coach\'s voice, on how we get there. Mention the first stop.'),
  milestones: z.array(z.object({
    title: z.string().describe('Short, e.g. "Halfway: 12 stone 2" or "First 5k without stopping"'),
    targetDate: z.string().describe('YYYY-MM-DD, strictly increasing, last one = the goal date'),
    metric: z.object({ label: z.string(), target: z.number(), unit: z.string().describe('kg for weight (always kg internally), otherwise a natural unit') }).nullable(),
    why: z.string().describe('One sentence: why this stop matters or what it proves'),
  })).min(1).max(6),
  weeklyCommitments: z.array(z.string()).min(1).max(4).describe('Reduce-not-ban rules for their stated obstacles, and one accountability commitment'),
  dailyActions: z.array(z.string()).min(2).max(4).describe('Concrete, checkable, under 8 words each. These are asked about on every evening call.'),
})

export async function generateRoadmap(user: repo.User): Promise<Roadmap> {
  const p = user.profile
  if (!p) throw new Error('Profile not set')
  const { date: today } = localParts(user.timezone)
  const unit = p.weightUnit ?? (p.accent === 'american' ? 'lbs' : 'stone')
  const input = {
    statement: p.plan.statement,
    targetDate: p.plan.targetDate || today,
    areaId: p.areaId,
    areaIds: p.areaIds,
    actionPlan: p.plan.actionPlan,
    obstacles: p.plan.obstacles,
    weightKg: p.weightKg,
    goalWeightKg: p.goalWeightKg,
    weightUnit: unit,
    today,
  }
  const fallback = buildLocalRoadmap(input)

  try {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(RoadmapOut) },
      system: [
        { type: 'text', text: personaBlock(p.coachId), cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: `Build ${p.name}'s plan by working backwards from the goal. Today is ${today}. By the inch it's a cinch: the first stop must feel close. Every milestone needs a date; measurable goals need a number at each stop. Obstacles get reduced, not banned.

Life areas: ${(p.areaIds?.length ? p.areaIds : [p.areaId]).map((a, i) => `${AREA_NAMES[a]}${i === 0 ? ' (main focus — the plan is about this)' : ''}`).join(', ')}
${(p.areaIds?.length ?? 0) > 1 ? 'Daily actions: mostly the main focus, but include one small action for each other area so the whole life moves.' : ''}
Goal: ${p.plan.statement}
Target date: ${input.targetDate}
${p.weightKg ? `Current weight: ${formatWeight(p.weightKg, unit)} (${p.weightKg} kg)` : ''}
${p.goalWeightKg ? `Goal weight: ${formatWeight(p.goalWeightKg, unit)} (${p.goalWeightKg} kg)` : ''}
Their own action plan: ${p.plan.actionPlan || '(none written)'}
Obstacles: ${p.plan.obstacles.join(', ') || '(none listed)'}
Benefits they want: ${p.plan.benefits.join(', ') || '(none listed)'}
Skills to build: ${p.plan.skills.join(', ') || '(none listed)'}

A sensible default plan, to improve on (dates are already evenly spaced):
${JSON.stringify({ milestones: fallback.milestones, dailyActions: fallback.dailyActions.map((a) => a.text) })}`,
        },
      ],
      messages: [{ role: 'user', content: 'Build the plan.' }],
    })
    const out = response.parsed_output
    if (!out) return fallback
    return {
      summary: out.summary,
      milestones: out.milestones.map((m, i) => ({ id: `m${i + 1}`, title: m.title, targetDate: m.targetDate, metric: m.metric ?? undefined, why: m.why })),
      weeklyCommitments: out.weeklyCommitments,
      dailyActions: out.dailyActions.map((text, i) => ({ id: `a${i + 1}`, text })),
      generatedAt: Date.now(),
      source: 'coach',
    }
  } catch (err) {
    console.warn('[roadmap] Claude unavailable, using local plan:', (err as Error).message)
    return fallback
  }
}
