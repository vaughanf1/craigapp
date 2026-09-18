import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from './client.ts'
import { personaBlock, contextBlock } from './prompt.ts'
import { buildContext } from './context.ts'
import * as repo from '../lib/repo.ts'
import type { DeliveryKind } from '../lib/types.ts'

const Brief = z.object({
  spoken: z.string().describe('What the coach says when the person answers. 3-5 short spoken sentences, ends with a question. No lists, no emojis.'),
  pushTitle: z.string().describe('Notification title, max 40 chars, e.g. "Maya is calling"'),
  pushBody: z.string().describe('Notification body, max 90 chars, the hook of the brief'),
  tomorrowFocus: z.string().describe('For evening briefs: the one thing for tomorrow. Otherwise empty string.'),
})
export type BriefContent = z.infer<typeof Brief>

const INSTRUCTIONS: Record<DeliveryKind, string> = {
  morning: `It's the MORNING CALL. Structure: (1) greet by name, (2) yesterday in one sentence with real numbers — calories vs target, or the check-in — and if they missed, say plainly we are not making up for it, (3) today's one focus, drawn from their plan, obstacles or the tomorrowFocus from last night, (4) one question that invites a reply.`,
  evening: `It's the EVENING REVIEW. Structure: (1) greet, (2) executive summary of today — what they logged, what they did, in real numbers, (3) what we're focusing on tomorrow — one thing, specific, (4) ask if that sounds right and wish them a good evening.`,
  manual: `They asked you to call them right now. Greet warmly, say something specific about where they are today, and ask what's on their mind.`,
}

/** Generate the personalised brief for a scheduled call/notification. */
export async function generateBrief(user: repo.User, kind: DeliveryKind): Promise<BriefContent> {
  if (!user.profile) throw new Error('Profile not set')
  const ctx = buildContext(user)
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: zodOutputFormat(Brief) },
    system: [
      { type: 'text', text: personaBlock(user.profile.coachId), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: contextBlock(ctx) },
    ],
    messages: [{ role: 'user', content: INSTRUCTIONS[kind] }],
  })
  const out = response.parsed_output
  if (!out) throw new Error('Brief generation returned no structured output')
  return out
}
