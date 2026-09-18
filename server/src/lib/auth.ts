import { createHmac, randomInt } from 'node:crypto'
import { getDb } from './db.ts'
import { env } from './env.ts'
import { sha256, uid } from './ids.ts'
import * as repo from './repo.ts'
import { sendVerification, checkVerification } from './twilio.ts'

/**
 * Passwordless sign-in by phone number. Twilio Verify sends the code when
 * configured; in development the code is DEV_OTP and printed to the console.
 * The phone number doubles as the number the coach rings.
 */

export function normalisePhone(raw: string, defaultCountry = '+44'): string | null {
  let s = raw.replace(/[\s()-]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (s.startsWith('0')) s = defaultCountry + s.slice(1)
  if (!s.startsWith('+')) s = defaultCountry + s
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null
}

export async function requestCode(phone: string): Promise<{ dev: boolean }> {
  if (env.twilio.enabled && env.twilio.verifySid) {
    await sendVerification(phone)
    return { dev: false }
  }
  const code = env.isProd ? String(randomInt(100000, 999999)) : env.devOtp
  getDb()
    .prepare('INSERT INTO otps (phone, code, expires_at, attempts) VALUES (?, ?, ?, 0) ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, attempts = 0')
    .run(phone, sha256(code), Date.now() + 10 * 60_000)
  console.log(`[auth] code for ${phone}: ${code}`)
  return { dev: true }
}

export async function verifyCode(phone: string, code: string): Promise<boolean> {
  if (env.twilio.enabled && env.twilio.verifySid) return checkVerification(phone, code)
  const row = getDb().prepare('SELECT code, expires_at, attempts FROM otps WHERE phone = ?').get(phone) as
    | { code: string; expires_at: number; attempts: number } | undefined
  if (!row || row.expires_at < Date.now() || row.attempts >= 5) return false
  getDb().prepare('UPDATE otps SET attempts = attempts + 1 WHERE phone = ?').run(phone)
  const ok = row.code === sha256(code.trim())
  if (ok) getDb().prepare('DELETE FROM otps WHERE phone = ?').run(phone)
  return ok
}

/* ---------- sessions: opaque token, hashed at rest ---------- */

export function createSession(userId: string): string {
  const token = uid(32)
  getDb()
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), userId, Date.now(), Date.now())
  return token
}

export function userForToken(token: string): repo.User | null {
  const row = getDb().prepare('SELECT user_id FROM sessions WHERE token_hash = ?').get(sha256(token)) as { user_id: string } | undefined
  if (!row) return null
  getDb().prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(Date.now(), sha256(token))
  return repo.findUser(row.user_id)
}

export function revokeSession(token: string) {
  getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
}

/** Short-lived signed token so the in-app call screen can be opened from a push without the session (e.g. a fresh tab) */
export function signDelivery(deliveryId: string): string {
  return createHmac('sha256', env.sessionSecret).update(deliveryId).digest('base64url').slice(0, 24)
}
