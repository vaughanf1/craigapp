import { env } from '../lib/env.ts'
import * as repo from '../lib/repo.ts'
import { getCoach } from '../../shared/coaches.ts'
import { personaBlock, contextBlock } from '../coach/prompt.ts'
import { buildContext } from '../coach/context.ts'

/**
 * Live two-way calls in the app: the browser talks to an ElevenLabs Agent over
 * WebRTC (speech in, the coach's real voice out, interrupt any time). The agent
 * on ElevenLabs is a shell — persona, context and opening line are supplied per
 * call from here, so the coach on a live call knows exactly what the brain knows.
 *
 * The server mints a short-lived conversation token (the API key never reaches
 * the browser) and hands back the overrides the client passes to startSession.
 */
export interface LiveCallSession {
  token: string
  agentId: string
  overrides: {
    agent: { prompt: { prompt: string }; firstMessage: string; language: 'en' }
    tts: { voiceId: string }
  }
}

export const liveCallsEnabled = () => Boolean(env.tts.elevenLabsKey && env.tts.agentId)

const LIVE_NOTE = `

This is a LIVE two-way VOICE CALL in the app, not a chat. You are speaking out loud and the person can interrupt you at any moment — that is fine, stop and listen. Keep every turn to one to three short spoken sentences, warm and conversational — this is a friend ringing, not a briefing. One question at a time. No lists, no markdown, no emojis. Use real numbers from the context when you have them. If they say they have to go, or the conversation has naturally finished, sign off warmly in one sentence that includes the word "goodbye".`

export async function liveCallSession(user: repo.User, delivery: { brief: string } | null): Promise<LiveCallSession> {
  if (!user.profile) throw new Error('Profile not set')
  if (!liveCallsEnabled()) throw new Error('Live calls are not configured')
  const coach = getCoach(user.profile.coachId)
  if (!coach.voiceId) throw new Error(`${coach.name} has no voice yet`)

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(env.tts.agentId)}`, {
    headers: { 'xi-api-key': env.tts.elevenLabsKey },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`ElevenLabs token ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const { token } = (await res.json()) as { token: string }

  const ctx = buildContext(user)
  const firstMessage = delivery?.brief?.trim() || `${user.profile.name ? `Hi ${user.profile.name}. ` : 'Hi. '}It's ${coach.name}. How's today going?`
  return {
    token,
    agentId: env.tts.agentId,
    overrides: {
      agent: { prompt: { prompt: personaBlock(coach.id) + '\n\n' + contextBlock(ctx) + LIVE_NOTE }, firstMessage, language: 'en' },
      tts: { voiceId: coach.voiceId },
    },
  }
}
