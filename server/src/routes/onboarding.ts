import { Hono } from 'hono'
import { z } from 'zod'
import { completeJson } from '../coach/llm.ts'
import { personaBlock } from '../coach/prompt.ts'
import { sharedRules } from '../coach/rules.ts'
import { getCoach } from '../../shared/coaches.ts'
import { formatWeight } from '../../shared/units.ts'
import { sha256 } from '../lib/ids.ts'

/**
 * Onboarding help from the coach brain, before there is an account. The person
 * has typed a goal and a date; the coach reads it and comes back with a
 * one-line reflection in their own voice plus suggestions specific to THAT goal
 * (benefits, obstacles, people, skills, a first draft of the action plan).
 * Unauthenticated, so: small, rate-limited per IP, cached per input.
 */
const app = new Hono()

const Input = z.object({
  name: z.string().max(60).optional(),
  statement: z.string().min(3).max(600),
  targetDate: z.string().max(10).optional(),
  areaIds: z.array(z.string().max(30)).max(6).default([]),
  coachId: z.string().max(30).optional(),
  weightKg: z.number().positive().max(400).optional(),
  goalWeightKg: z.number().positive().max(400).optional(),
  weightUnit: z.enum(['stone', 'lbs', 'kg']).optional(),
})

export const Suggestions = z.object({
  reflection: z.string().describe("One or two spoken sentences in the coach's voice showing you understood THIS goal: use their words and numbers (distance to go, weeks left, rate needed). No greeting, no generic encouragement."),
  sharper: z.string().nullable().describe('If the goal is vague or unmeasurable, one short sentence suggesting how to sharpen it (add a number, a date, or the observable evidence). Null if it is already specific.'),
  benefits: z.array(z.string().max(60)).min(4).max(6).describe("What's in it for THEM, specific to this goal and what they wrote. Short, first person, e.g. 'Walk up the stairs without stopping'."),
  obstacles: z.array(z.string().max(60)).min(4).max(6).describe('What will realistically get in the way of THIS goal. Specific situations, not character flaws.'),
  supporters: z.array(z.string().max(60)).min(3).max(5).describe('People or groups who could help with this goal, phrased as options they can pick.'),
  skills: z.array(z.string().max(60)).min(3).max(5).describe('Skills or knowledge this particular goal will need.'),
  actionPlanDraft: z.string().max(500).describe('A first draft of the plan of action in 2-4 plain sentences: the milestones by month, the weekly actions, the daily habit. Specific to the goal and date; numbers where they exist.'),
})
export type SuggestionsT = z.infer<typeof Suggestions>

/** Per-IP rate limit: a handful of calls a minute is plenty for one person onboarding */
const hits = new Map<string, number[]>()
function limited(ip: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > max
}

const cache = new Map<string, SuggestionsT>()

app.post('/suggest', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('cf-connecting-ip') || 'local'
  if (limited(ip)) return c.json({ error: 'Slow down a moment' }, 429)
  const body = Input.safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) return c.json({ error: 'Tell me the goal first' }, 400)
  const input = body.data
  const key = sha256(JSON.stringify(input))
  const hit = cache.get(key)
  if (hit) return c.json(hit)

  // Before a coach is chosen the brain answers as a neutral Be More coach: same rules, no persona's catchphrases
  const coach = input.coachId ? getCoach(input.coachId) : null
  const persona = coach
    ? personaBlock(coach.id)
    : `You are a Be More coach — warm, specific and plain-spoken. The person has not chosen their coach yet, so speak as the app itself: no catchphrases, no character, just a sharp reading of their goal.\n\n${sharedRules('the coach')}`
  const unit = input.weightUnit ?? 'stone'
  const facts = [
    input.name ? `Name: ${input.name}` : '',
    `Goal, in their words: "${input.statement}"`,
    input.targetDate ? `Target date: ${input.targetDate} (today is ${new Date().toISOString().slice(0, 10)})` : 'No target date given yet',
    input.areaIds.length ? `Life areas: ${input.areaIds.join(', ')}` : '',
    input.weightKg ? `Current weight: ${formatWeight(input.weightKg, unit)}` : '',
    input.goalWeightKg ? `Goal weight: ${formatWeight(input.goalWeightKg, unit)}` : '',
  ].filter(Boolean).join('\n')

  const out = await completeJson({
    schema: Suggestions,
    name: 'onboarding_suggestions',
    maxTokens: 1200,
    effort: 'low',
    system: [
      persona,
      `The person is still onboarding — there is no history yet. You have only what is below. Read the goal closely and respond to THAT goal, not to the category. Everything you suggest must be something this specific person could tick or type. Do not invent numbers they did not give; do the arithmetic on the ones they did.\n\n${facts}`,
    ],
    messages: [{ role: 'user', content: 'Read my goal and help me build the plan around it.' }],
  })
  if (!out) return c.json({ error: 'The coach could not read that just now' }, 503)
  cache.set(key, out)
  if (cache.size > 500) cache.delete(cache.keys().next().value!)
  return c.json(out)
})

export default app
