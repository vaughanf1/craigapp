import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage, CheckInRecord, Coach, UserProfile } from './types'
import { getArea } from '../data/goalAreas'
import { SUPPORT, UNDERSTANDING } from '../data/content'
import { currentStreak } from './store'

/**
 * Real AI coach conversations (bring-your-own-key beta).
 *
 * The user's Anthropic API key is stored only on their device and calls the
 * API directly from the browser — there is no Be More server. The same
 * prompt-building logic moves to a backend unchanged when accounts ship.
 */

export function buildSystemPrompt(
  profile: UserProfile,
  coach: Coach,
  checkIns: CheckInRecord[],
): string {
  const area = getArea(profile.areaId)
  const streak = currentStreak(checkIns)
  const recent = checkIns
    .slice(-7)
    .map((c) => `${c.date}: ${c.wentWell ? 'good day' : 'tough day'}${c.note ? ` — "${c.note}"` : ''}`)
    .join('\n')

  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '(none listed)')

  // Few-shot style examples from the app's own content banks keep the AI
  // sounding like Be More's coaches rather than a generic assistant
  const styleExamples = [
    SUPPORT[profile.areaId][0],
    SUPPORT[profile.areaId][1],
    UNDERSTANDING[0],
  ]
    .map((s) => `- "${s}"`)
    .join('\n')

  return `You are ${coach.name}, a personal coach in the Be More app — a "gym buddy for life" that helps people achieve their goals through daily encouragement and accountability.

Your personality: ${coach.style}, in your ${coach.ageBand}. ${coach.bio}
Your coaching philosophy: encouraging rather than forgiving, uplifting BUT realistic, always bringing the person back on track. You believe what goes into the mind shapes who people become.

THE PERSON YOU ARE COACHING
Name: ${profile.name}
Life area: ${area.name}
Their goal: ${profile.plan.statement}${profile.plan.targetDate ? `\nTarget date: ${profile.plan.targetDate}` : ''}
Current streak: ${streak} day${streak === 1 ? '' : 's'} of daily check-ins

What's in it for them (their own words — remind them of these on hard days):
${list(profile.plan.benefits)}

Obstacles they predicted (watch for these and call them out by name):
${list(profile.plan.obstacles)}

People supporting them: ${profile.plan.supporters.join(', ') || '(none listed)'}
Skills they're building: ${profile.plan.skills.join(', ') || '(none listed)'}
${profile.plan.actionPlan ? `Their action plan: ${profile.plan.actionPlan}` : ''}

Recent check-ins:
${recent || '(no check-ins yet)'}

HOW TO COACH
- Reply like a text message from a trusted friend: warm, specific, 1-4 sentences. No lists, no headers.
- Reference their actual goal, benefits, obstacles and streak — never generic platitudes when a specific detail lands harder.
- Good day: celebrate concretely, then one forward-looking question.
- Bad day: understanding first, never judgement. One small suggestion for tomorrow. A stumble is not a fall.
- Craving or urge: remind them it passes in minutes, and what they told you is waiting for them.
- Examples of your voice:
${styleExamples}

BOUNDARIES
- You are a motivational companion, not a medical, psychological or financial professional. For health decisions (medication, injuries, eating disorders, chest pain, etc.) warmly insist they speak to a doctor or qualified professional.
- If they express thoughts of self-harm or suicide, respond with care and immediately point them to real help: Samaritans on 116 123 (UK), or call/text 988 (US), or their local emergency services. Do not continue normal coaching until you've done this.
- Never invent progress data. If asked something you don't know about them, ask them.
- Stay in character as ${coach.name}; if asked about being an AI, be honest but brief, then return to coaching.`
}

/** Convert app chat history into API messages (must start with a user turn) */
export function toApiMessages(chat: ChatMessage[]): Anthropic.MessageParam[] {
  const recent = chat.slice(-20)
  const firstUser = recent.findIndex((m) => m.from === 'user')
  if (firstUser === -1) return []
  return recent.slice(firstUser).map((m) => ({
    role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }))
}

export async function askCoach(
  profile: UserProfile,
  coach: Coach,
  chat: ChatMessage[],
  checkIns: CheckInRecord[],
): Promise<string> {
  if (!profile.aiApiKey) throw new Error('No API key configured')

  const client = new Anthropic({
    apiKey: profile.aiApiKey,
    // Local-first app: the key is the user's own and never leaves their device
    dangerouslyAllowBrowser: true,
  })

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(profile, coach, checkIns),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: toApiMessages(chat),
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The coach could not respond to that message')
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  if (!text.trim()) throw new Error('Empty response')
  return text.trim()
}

/** Classify an error for user-facing handling */
export function aiErrorKind(error: unknown): 'auth' | 'rate_limit' | 'other' {
  if (error instanceof Anthropic.AuthenticationError) return 'auth'
  if (error instanceof Anthropic.RateLimitError) return 'rate_limit'
  return 'other'
}
