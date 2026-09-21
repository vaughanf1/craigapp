import { z } from 'zod'
import { completeJson } from './llm.ts'
import * as repo from '../lib/repo.ts'
import { localParts } from '../lib/time.ts'
import { buildContext } from './context.ts'
import { currentPhase } from '../../shared/warmap.ts'
import { INTAKE_FIELDS } from './intake.ts'

/**
 * The memory engine. Every conversation is mined for durable facts about the
 * person, and each day gets a summary — so the coach knows them better every
 * week and switching apps would mean starting from scratch.
 */

const MemoryUpdate = z.object({
  add: z.array(z.object({
    kind: z.enum(['fact', 'preference', 'pattern', 'event', 'win', 'struggle']),
    text: z.string().describe('One sentence, third person, specific. e.g. "Hates the gym but enjoys walking the dog."'),
    importance: z.number().int().min(1).max(3).describe('3 = shapes coaching every day, 2 = useful context, 1 = minor'),
  })),
  archive: z.array(z.string()).describe('IDs of existing memories now outdated or contradicted'),
  day: z.object({
    summary: z.string().describe('Two sentences on how today went, in the coach\'s voice, past tense'),
    mood: z.string().describe('One or two words'),
    wins: z.string(),
    struggles: z.string(),
    tomorrowFocus: z.string().describe('The single most useful thing to focus on tomorrow'),
  }).nullable().describe('Only when the conversation revealed something about today; otherwise null'),
  actionsDone: z.array(z.string()).describe('IDs of daily actions (from the list) they said they completed today'),
  actionsMissed: z.array(z.string()).describe('IDs of daily actions they said they did NOT do today'),
  weighIn: z.number().nullable().describe('If they stated their current weight today, in kg (convert stone/lbs); otherwise null'),
  discovery: z.array(z.object({
    field: z.enum(INTAKE_FIELDS.map((f) => f.id) as [string, ...string[]]),
    answer: z.string().describe('Their answer in one or two sentences, third person, specific'),
  })).describe('Discovery fields this conversation answered (fully or usefully). Only fields genuinely addressed.'),
  tasksDone: z.array(z.string()).describe('IDs of board tasks they said they have completed'),
  newTasks: z.array(z.object({
    title: z.string().describe('Imperative, under 10 words'),
    detail: z.string(),
    due: z.string().nullable().describe('YYYY-MM-DD if they gave a day ("Friday", "next week") — resolve it from today\'s date; else null'),
  })).describe('Concrete one-off things they committed to doing that are not already on the board'),
})

const pending = new Map<string, NodeJS.Timeout>()

/** Debounced: extract a little after the conversation goes quiet, not on every message. */
export function rememberLater(userId: string, delayMs = 20_000) {
  const t = pending.get(userId)
  if (t) clearTimeout(t)
  pending.set(userId, setTimeout(() => {
    pending.delete(userId)
    remember(userId).catch((err) => console.error('[memory] extraction failed', userId, err))
  }, delayMs))
}

export async function remember(userId: string): Promise<{ added: number; archived: number }> {
  const user = repo.findUser(userId)
  if (!user?.profile) return { added: 0, archived: 0 }
  const fresh = repo.unmemorisedMessages(userId)
  if (!fresh.length) return { added: 0, archived: 0 }

  const existing = repo.listMemories(userId)
  const { date } = localParts(user.timezone)
  const ctx = buildContext(user)
  const transcript = fresh.map((m) => `${m.role === 'user' ? user.profile!.name : 'Coach'} (${m.channel}): ${m.text}`).join('\n')

  const out = await completeJson({
    schema: MemoryUpdate,
    name: 'memory_update',
    maxTokens: 4096,
    effort: 'low',
    system: [`You maintain the long-term memory of a personal coaching app for one person. From new conversation, extract only durable, useful facts about THEM — circumstances, preferences, triggers, people, upcoming events, patterns, wins and struggles. Skip pleasantries, skip anything already remembered, and never store medical diagnoses beyond what they volunteered. Write in third person, specific and short.

Their goal: ${user.profile.plan.statement}
Today (their local date): ${date}
Today's food log: ${ctx.todayFood.map((f) => `${f.label} ${f.calories}`).join(', ') || 'nothing logged'}${user.profile.calorieTarget ? ` (target ${user.profile.calorieTarget})` : ''}

Discovery fields (id: meaning) — fill any this conversation answers:
${INTAKE_FIELDS.map((f) => `${f.id}: ${f.label} — ${f.ask}`).join('\n')}
Already known: ${Object.keys(repo.listIntake(userId)).join(', ') || '(none)'}

Board tasks (id: title, due) — mark done if they say so; add new ones they commit to:
${repo.listTasks(userId).filter((t) => t.status !== 'done' && t.status !== 'skipped').map((t) => `${t.id}: ${t.title}${t.due ? `, due ${t.due}` : ''}`).join('\n') || '(empty)'}

Daily actions on their plan (id: text):
${user.profile.plan.roadmap?.dailyActions.map((a) => `${a.id}: ${a.text}`).join('\n') || '(no plan yet)'}

EXISTING MEMORIES (id: text)
${existing.map((m) => `${m.id}: [${m.kind}] ${m.text}`).join('\n') || '(none)'}`],
    messages: [{ role: 'user', content: `NEW CONVERSATION\n${transcript}` }],
  })
  if (!out) return { added: 0, archived: 0 }

  for (const m of out.add) repo.addMemory(userId, { ...m, source: fresh[0].channel })
  const validIds = new Set(existing.map((m) => m.id))
  const toArchive = out.archive.filter((id) => validIds.has(id))
  for (const id of toArchive) repo.archiveMemory(userId, id)

  if (out.day) {
    const eaten = ctx.todayFood.filter((f) => f.kind === 'food').reduce((s, f) => s + f.calories, 0)
    repo.upsertSummary(userId, {
      date,
      summary: out.day.summary,
      mood: out.day.mood,
      wins: out.day.wins,
      struggles: out.day.struggles,
      tomorrowFocus: out.day.tomorrowFocus,
      caloriesIn: ctx.todayFood.length ? eaten : null,
      caloriesTarget: user.profile.calorieTarget ?? null,
    })
  }
  const actionIds = new Set(user.profile.plan.roadmap?.dailyActions.map((a) => a.id) ?? [])
  for (const id of out.actionsDone) if (actionIds.has(id)) repo.setAction(userId, { date, actionId: id, done: true })
  for (const id of out.actionsMissed) if (actionIds.has(id)) repo.setAction(userId, { date, actionId: id, done: false })
  if (out.weighIn && out.weighIn > 20 && out.weighIn < 400) repo.upsertWeighIn(userId, { date, kg: out.weighIn })
  for (const d of out.discovery ?? []) if (d.answer.trim()) repo.setIntake(userId, d.field, d.answer.trim())
  const openTasks = new Set(repo.listTasks(userId).filter((t) => t.status === 'todo' || t.status === 'doing').map((t) => t.id))
  for (const id of out.tasksDone ?? []) if (openTasks.has(id)) repo.updateTask(userId, id, { status: 'done' })
  const phase = repo.getWarMap(userId).map ? currentPhase(repo.getWarMap(userId).map!, date) : null
  for (const t of (out.newTasks ?? []).slice(0, 5)) {
    repo.addTask(userId, { phaseId: phase?.id ?? null, title: t.title, detail: t.detail, due: t.due, status: 'todo', effort: 'M', source: 'coach' })
  }
  repo.markMemorised(fresh.map((m) => m.id))
  return { added: out.add.length, archived: toArchive.length }
}
