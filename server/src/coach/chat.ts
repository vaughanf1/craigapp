import { completeText } from './llm.ts'
import { personaBlock, contextBlock } from './prompt.ts'
import { buildContext } from './context.ts'
import * as repo from '../lib/repo.ts'
import { rememberLater } from './memory.ts'

export type Channel = 'chat' | 'call'

/** Turn stored messages into API turns; the API requires the first turn to be the user's. */
export function toTurns(messages: repo.StoredMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  const first = messages.findIndex((m) => m.role === 'user')
  if (first === -1) return []
  return messages.slice(first).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
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

  const answer = await completeText({
    system: [personaBlock(user.profile.coachId), contextBlock(ctx) + channelNote],
    messages: history,
    maxTokens: 1024,
    effort: 'low',
  })

  repo.addMessage(user.id, 'coach', answer, channel)
  rememberLater(user.id)
  return answer
}
