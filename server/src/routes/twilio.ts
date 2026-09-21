import { Hono } from 'hono'
import * as repo from '../lib/repo.ts'
import { env } from '../lib/env.ts'
import { twiml, validSignature } from '../lib/twilio.ts'
import { reply } from '../coach/chat.ts'
import { getCoach } from '../../shared/coaches.ts'

/**
 * Real phone calls. Twilio dials the user; when they answer it POSTs here for
 * TwiML. We speak the brief, listen, run the reply through the coach brain,
 * and loop — a conversation with your coach on an actual phone call.
 */
const app = new Hono()

async function formParams(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }): Promise<Record<string, string>> {
  const raw = await c.req.parseBody()
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') out[k] = v
  return out
}

app.post('/voice/:id', async (c) => {
  const params = await formParams(c)
  const url = `${env.publicUrl}/twilio/voice/${c.req.param('id')}`
  if (!validSignature(c.req.header('x-twilio-signature'), url, params)) return c.text('forbidden', 403)

  const d = repo.getDelivery(c.req.param('id'))
  const user = d && repo.findUser(d.userId)
  if (!d || !user?.profile) return c.body(twiml({ voice: 'Polly.Amy-Neural', say: 'Sorry, something went wrong. Goodbye.' }), 200, XML)
  const coach = getCoach(user.profile.coachId)

  // Voicemail picked up: leave the brief and hang up
  if (params.AnsweredBy && params.AnsweredBy.startsWith('machine')) {
    repo.setDeliveryStatus(d.id, 'missed')
    return c.body(twiml({ voice: coach.phoneVoice, say: `${d.brief} Open the app when you get a minute. Speak soon.` }), 200, XML)
  }

  if (d.status !== 'answered') {
    repo.setDeliveryStatus(d.id, 'answered', params.CallSid)
    repo.addMessage(user.id, 'coach', d.brief, 'call')
  }
  return c.body(twiml({
    voice: coach.phoneVoice,
    say: d.brief,
    gatherAction: `${env.publicUrl}/twilio/gather/${d.id}?t=1`,
    reprompt: "No worries if now's not a good time. I'll pop it in the app. Speak soon.",
  }), 200, XML)
})

app.post('/gather/:id', async (c) => {
  const params = await formParams(c)
  const turn = Number(c.req.query('t') ?? '1')
  const url = `${env.publicUrl}/twilio/gather/${c.req.param('id')}?t=${turn}`
  if (!validSignature(c.req.header('x-twilio-signature'), url, params)) return c.text('forbidden', 403)

  const d = repo.getDelivery(c.req.param('id'))
  const user = d && repo.findUser(d.userId)
  if (!d || !user?.profile) return c.body(twiml({ voice: 'Polly.Amy-Neural', say: 'Goodbye.' }), 200, XML)
  const coach = getCoach(user.profile.coachId)
  const heard = (params.SpeechResult ?? '').trim()

  if (!heard) {
    return c.body(twiml({ voice: coach.phoneVoice, say: "I didn't catch that, so I'll let you go. It's all in the app. Speak soon." }), 200, XML)
  }

  // Past the soft limit the coach is told to wrap up; Twilio's TimeLimit is the hard stop
  const elapsed = (Date.now() - (d.answeredAt ?? d.createdAt)) / 1000
  const wrapUp = elapsed >= env.call.wrapUpSeconds || turn >= env.call.maxTurns - 1
  let answer: string
  try {
    answer = await reply(user, heard, 'call', wrapUp ? 'wrap-up' : undefined)
  } catch (err) {
    console.error('[twilio] reply failed', err)
    answer = "I'm having trouble hearing you properly, so let's pick this up in the app. Speak soon. Goodbye."
  }
  const finished = turn >= env.call.maxTurns || /\bgoodbye\b/i.test(answer) || /\b(bye|goodbye|got to go|gotta go|speak later)\b/i.test(heard)
  return c.body(twiml({
    voice: coach.phoneVoice,
    say: answer,
    gatherAction: finished ? undefined : `${env.publicUrl}/twilio/gather/${d.id}?t=${turn + 1}`,
    reprompt: 'Okay, I\'ll let you get on. Speak soon.',
  }), 200, XML)
})

app.post('/status/:id', async (c) => {
  const params = await formParams(c)
  const url = `${env.publicUrl}/twilio/status/${c.req.param('id')}`
  if (!validSignature(c.req.header('x-twilio-signature'), url, params)) return c.text('forbidden', 403)
  const d = repo.getDelivery(c.req.param('id'))
  if (d && d.status !== 'answered' && ['no-answer', 'busy', 'failed', 'canceled'].includes(params.CallStatus ?? '')) {
    repo.setDeliveryStatus(d.id, 'missed')
  }
  return c.text('ok')
})

const XML = { 'Content-Type': 'text/xml' }
export default app
