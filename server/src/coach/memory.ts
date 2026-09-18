import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from './client.ts'
import * as repo from '../lib/repo.ts'
import { localParts } from '../lib/time.ts'
import { buildContext } from './context.ts'

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

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: zodOutputFormat(MemoryUpdate) },
    system: `You maintain the long-term memory of a personal coaching app for one person. From new conversation, extract only durable, useful facts about THEM — circumstances, preferences, triggers, people, upcoming events, patterns, wins and struggles. Skip pleasantries, skip anything already remembered, and never store medical diagnoses beyond what they volunteered. Write in third person, specific and short.

Their goal: ${user.profile.plan.statement}
Today (their local date): ${date}
Today's food log: ${ctx.todayFood.map((f) => `${f.label} ${f.calories}`).join(', ') || 'nothing logged'}${user.profile.calorieTarget ? ` (target ${user.profile.calorieTarget})` : ''}

EXISTING MEMORIES (id: text)
${existing.map((m) => `${m.id}: [${m.kind}] ${m.text}`).join('\n') || '(none)'}`,
    messages: [{ role: 'user', content: `NEW CONVERSATION\n${transcript}` }],
  })

  const out = response.parsed_output
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
  repo.markMemorised(fresh.map((m) => m.id))
  return { added: out.add.length, archived: toArchive.length }
}
