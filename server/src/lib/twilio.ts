import { createHmac } from 'node:crypto'
import { env } from './env.ts'
import { safeEqual } from './ids.ts'

/**
 * Minimal Twilio client over fetch: Verify (OTP sign-in) and Programmable
 * Voice (outbound coach calls). No SDK — three endpoints and a signature check.
 */

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64')
}

async function post(url: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  })
  const body = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(body.message as string) ?? JSON.stringify(body)}`)
  return body
}

/* ---------- Verify ---------- */

export async function sendVerification(phone: string): Promise<void> {
  await post(`https://verify.twilio.com/v2/Services/${env.twilio.verifySid}/Verifications`, { To: phone, Channel: 'sms' })
}

export async function checkVerification(phone: string, code: string): Promise<boolean> {
  const r = await post(`https://verify.twilio.com/v2/Services/${env.twilio.verifySid}/VerificationCheck`, { To: phone, Code: code })
  return r.status === 'approved'
}

/* ---------- Voice ---------- */

export interface CallResult { sid: string; simulated: boolean }

/** Ring the user; Twilio fetches TwiML from `url` when they answer. */
export async function placeCall(to: string, url: string, statusCallback: string): Promise<CallResult> {
  if (!env.twilio.enabled || !env.twilio.fromNumber) {
    console.log(`[call:simulated] → ${to}\n  TwiML from ${url}`)
    return { sid: `SIM${Date.now()}`, simulated: true }
  }
  const r = await post(`https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Calls.json`, {
    To: to,
    From: env.twilio.fromNumber,
    Url: url,
    Method: 'POST',
    StatusCallback: statusCallback,
    StatusCallbackMethod: 'POST',
    StatusCallbackEvent: 'answered completed',
    MachineDetection: 'Enable',
    Timeout: '25',
  })
  return { sid: r.sid as string, simulated: false }
}

/** Twilio signs webhooks with HMAC-SHA1 over the full URL + sorted POST params. */
export function validSignature(signature: string | undefined, url: string, params: Record<string, string>): boolean {
  if (!env.twilio.enabled) return true // dev: unsigned simulated webhooks are fine
  if (!signature) return false
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  const expected = createHmac('sha1', env.twilio.authToken).update(data).digest('base64')
  return safeEqual(signature, expected)
}

/* ---------- TwiML ---------- */

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)
}

export interface TwimlTurn {
  voice: string
  say: string
  /** Where to POST the caller's speech; omit to hang up after speaking */
  gatherAction?: string
  /** Spoken if the caller says nothing */
  reprompt?: string
}

export function twiml(turn: TwimlTurn): string {
  const say = `<Say voice="${escapeXml(turn.voice)}" language="en-GB">${escapeXml(turn.say)}</Say>`
  if (!turn.gatherAction) return `<?xml version="1.0" encoding="UTF-8"?><Response>${say}<Hangup/></Response>`
  const reprompt = turn.reprompt ?? "I didn't catch that. Speak to you soon."
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${say}<Gather input="speech" action="${escapeXml(turn.gatherAction)}" method="POST" language="en-GB" speechTimeout="auto" speechModel="phone_call" actionOnEmptyResult="true"></Gather><Say voice="${escapeXml(turn.voice)}" language="en-GB">${escapeXml(reprompt)}</Say><Hangup/></Response>`
}
