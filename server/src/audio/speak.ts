import { getDb } from '../lib/db.ts'
import { sha256, uid } from '../lib/ids.ts'
import { env } from '../lib/env.ts'
import { getCoach } from '../../shared/coaches.ts'
import { ElevenLabsProvider } from './elevenlabs.ts'
import type { AudioFormat, TtsProvider } from './provider.ts'

/**
 * speak(): the one call the app (and later the phone pipeline) makes to get a
 * coach's voice. Order of business: cache → caps → provider → log. Anything
 * that can't be served comes back as a fallback with a reason, never a throw,
 * so the caller can drop to browser speech and the call carries on.
 */

export type FallbackReason = 'no-provider' | 'no-voice' | 'user-cap' | 'global-cap' | 'budget' | 'provider-error' | 'empty'

export type SpeakResult =
  | { ok: true; audio: Uint8Array; mime: string; cached: boolean; chars: number; costMicro: number }
  | { ok: false; reason: FallbackReason }

export interface SpeakRequest {
  userId: string | null
  coachId: string
  text: string
  format?: AudioFormat
}

/** Mutable copy of the env limits so tests (and an admin endpoint later) can tune them */
export const ttsConfig = {
  costPer1MUsd: env.tts.costPer1MUsd,
  perUserDailyChars: env.tts.perUserDailyChars,
  globalDailyChars: env.tts.globalDailyChars,
  monthlyBudgetUsd: env.tts.monthlyBudgetUsd,
}

let provider: TtsProvider | null | undefined
function getProvider(): TtsProvider | null {
  if (provider !== undefined) return provider
  provider = env.tts.enabled ? new ElevenLabsProvider() : null
  return provider
}
/** Test hook: inject a stub provider (or null to simulate no key) */
export function setProviderForTests(p: TtsProvider | null) {
  provider = p
}

const normalise = (t: string) => t.replace(/\s+/g, ' ').trim()
const dayStart = (now: number) => { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return d.getTime() }
const monthStart = (now: number) => { const d = new Date(now); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d.getTime() }

function charsSince(ts: number, userId?: string): number {
  const db = getDb()
  const r = userId
    ? db.prepare('SELECT COALESCE(SUM(chars),0) AS n FROM tts_log WHERE user_id = ? AND ts >= ?').get(userId, ts)
    : db.prepare('SELECT COALESCE(SUM(chars),0) AS n FROM tts_log WHERE ts >= ?').get(ts)
  return Number((r as { n: number }).n)
}
function costSince(ts: number): number {
  const r = getDb().prepare('SELECT COALESCE(SUM(cost_micro),0) AS n FROM tts_log WHERE ts >= ?').get(ts) as { n: number }
  return Number(r.n)
}

function log(e: { userId: string | null; coachId: string; provider: string; voiceId: string | null; chars: number; cached: boolean; costMicro: number; ms: number; reason?: FallbackReason }) {
  getDb().prepare(
    'INSERT INTO tts_log (id, user_id, coach_id, provider, voice_id, chars, cached, cost_micro, ms, reason, ts) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  ).run(uid(), e.userId, e.coachId, e.provider, e.voiceId, e.chars, e.cached ? 1 : 0, e.costMicro, e.ms, e.reason ?? null, Date.now())
}

export async function speak(req: SpeakRequest): Promise<SpeakResult> {
  const started = Date.now()
  const coach = getCoach(req.coachId)
  const format: AudioFormat = req.format ?? 'mp3'
  const text = normalise(req.text)
  const fail = (reason: FallbackReason, voiceId: string | null = coach.voiceId): SpeakResult => {
    log({ userId: req.userId, coachId: coach.id, provider: 'browser', voiceId, chars: 0, cached: false, costMicro: 0, ms: Date.now() - started, reason })
    return { ok: false, reason }
  }

  if (!text) return fail('empty')
  const p = getProvider()
  if (!p) return fail('no-provider')
  if (!coach.voiceId) return fail('no-voice')

  // 1. Cache: identical text in the same voice is never generated twice
  const db = getDb()
  const key = sha256(`${p.id}|${p.model}|${coach.voiceId}|${format}|${text}`)
  const hit = db.prepare('SELECT audio, mime, chars FROM tts_cache WHERE key = ?').get(key) as { audio: Uint8Array; mime: string; chars: number } | undefined
  if (hit) {
    db.prepare('UPDATE tts_cache SET hits = hits + 1 WHERE key = ?').run(key)
    log({ userId: req.userId, coachId: coach.id, provider: p.id, voiceId: coach.voiceId, chars: 0, cached: true, costMicro: 0, ms: Date.now() - started })
    return { ok: true, audio: new Uint8Array(hit.audio), mime: hit.mime, cached: true, chars: hit.chars, costMicro: 0 }
  }

  // 2. Caps — checked before we spend, in characters because that is how providers bill
  const now = Date.now()
  if (req.userId && charsSince(dayStart(now), req.userId) + text.length > ttsConfig.perUserDailyChars) return fail('user-cap')
  if (charsSince(dayStart(now)) + text.length > ttsConfig.globalDailyChars) return fail('global-cap')
  const costMicro = Math.round(text.length * ttsConfig.costPer1MUsd)
  if (costSince(monthStart(now)) + costMicro > ttsConfig.monthlyBudgetUsd * 1_000_000) return fail('budget')

  // 3. Provider
  let result
  try {
    result = await p.synthesize({ text, voiceId: coach.voiceId, format })
  } catch (err) {
    console.error('[voice] provider failed:', (err as Error).message)
    return fail('provider-error')
  }
  if (!result.audio.byteLength) return fail('provider-error')

  // 4. Store + log the real cost
  db.prepare('INSERT OR REPLACE INTO tts_cache (key, coach_id, voice_id, mime, audio, chars, created_at, hits) VALUES (?,?,?,?,?,?,?,0)')
    .run(key, coach.id, coach.voiceId, result.mime, result.audio, text.length, now)
  log({ userId: req.userId, coachId: coach.id, provider: p.id, voiceId: coach.voiceId, chars: text.length, cached: false, costMicro, ms: Date.now() - started })
  return { ok: true, audio: result.audio, mime: result.mime, cached: false, chars: text.length, costMicro }
}

/** The real per-user economics: what this user and the whole service have spent */
export function voiceStats(userId: string) {
  const now = Date.now()
  const db = getDb()
  const row = (sql: string, ...args: (string | number)[]) => db.prepare(sql).get(...args) as Record<string, number>
  const user = row(
    'SELECT COUNT(*) AS requests, COALESCE(SUM(cached),0) AS cached, COALESCE(SUM(chars),0) AS chars, COALESCE(SUM(cost_micro),0) AS costMicro, COALESCE(SUM(CASE WHEN provider = \'browser\' THEN 1 ELSE 0 END),0) AS fallbacks FROM tts_log WHERE user_id = ? AND ts >= ?',
    userId, monthStart(now),
  )
  const today = row('SELECT COALESCE(SUM(chars),0) AS chars FROM tts_log WHERE user_id = ? AND ts >= ?', userId, dayStart(now))
  const global = row('SELECT COALESCE(SUM(chars),0) AS chars, COALESCE(SUM(cost_micro),0) AS costMicro FROM tts_log WHERE ts >= ?', monthStart(now))
  return {
    provider: getProvider()?.id ?? 'browser',
    user: {
      month: { requests: user.requests, cached: user.cached, chars: user.chars, fallbacks: user.fallbacks, costUsd: user.costMicro / 1e6 },
      todayChars: today.chars,
      dailyCapChars: ttsConfig.perUserDailyChars,
    },
    global: { month: { chars: global.chars, costUsd: global.costMicro / 1e6, budgetUsd: ttsConfig.monthlyBudgetUsd } },
  }
}
