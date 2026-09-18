import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODEL, FALLBACK_BETAS, FALLBACKS } from './client.ts'
import { personaBlock, contextBlock } from './prompt.ts'
import { buildContext } from './context.ts'
import * as repo from '../lib/repo.ts'
import { rememberLater } from './memory.ts'

export type Channel = 'chat' | 'call'

/** Turn stored messages into API turns; the API requires the first turn to be the user's. */
export function toTurns(messages: repo.StoredMessage[]): Anthropic.MessageParam[] {
  const first = messages.findIndex((m) => m.role === 'user')
  if (first === -1) return []
  return messages.slice(first).map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text,
  }))
}

/**
 * The user said something (typed or spoken). Store it, answer as the coach,
 * store the answer, and queue memory extraction.
 */
export async function reply(user: repo.User, text: string, channel: Channel): Promise<string> {
  if (!user.profile) throw new Error('Profile not set')
  repo.addMessage(user.id, 'user', text, channel)

  const ctx = buildContext(user)
  const history = toTurns(repo.recentMessages(user.id, 30))
  const channelNote = channel === 'call'
    ? '\n\nThis is a live PHONE CALL. Keep each turn to 2-3 short spoken sentences. End with a question, or if the conversation is naturally finishing, a warm sign-off that includes the word "goodbye".'
    : ''

  const response = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 1024,
    betas: FALLBACK_BETAS,
    fallbacks: FALLBACKS,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: personaBlock(user.profile.coachId), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: contextBlock(ctx) + channelNote },
    ],
    messages: history,
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The coach could not respond to that message')
  }
  const answer = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!answer) throw new Error('Empty response from coach')

  repo.addMessage(user.id, 'coach', answer, channel)
  rememberLater(user.id)
  return answer
}
