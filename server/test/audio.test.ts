import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { openDb, useDb, getDb } from '../src/lib/db.ts'
import { speak, setProviderForTests, ttsConfig, voiceStats } from '../src/audio/speak.ts'
import { COACHES } from '../shared/coaches.ts'
import type { TtsProvider } from '../src/audio/provider.ts'

const synth = vi.fn()
const fake: TtsProvider = { id: 'fake', model: 'fake-1', synthesize: synth }

/** Give one coach a voice for the duration of the tests */
const coach = COACHES[0]
const original = coach.voiceId

beforeAll(() => {
  useDb(openDb(':memory:'))
  coach.voiceId = 'voice-test-123'
})
beforeEach(() => {
  getDb().exec('DELETE FROM tts_cache; DELETE FROM tts_log')
  synth.mockReset()
  synth.mockImplementation(async ({ text }) => ({ audio: new TextEncoder().encode(`AUDIO:${text}`), mime: 'audio/mpeg' }))
  setProviderForTests(fake)
  Object.assign(ttsConfig, { costPer1MUsd: 40, perUserDailyChars: 15_000, globalDailyChars: 1_000_000, monthlyBudgetUsd: 100 })
})

describe('the audio layer', () => {
  it('synthesises once and serves identical text from the cache for free', async () => {
    const a = await speak({ userId: 'u1', coachId: coach.id, text: 'Morning! Scoreboard time.' })
    const b = await speak({ userId: 'u2', coachId: coach.id, text: '  Morning!   Scoreboard time. ' }) // whitespace-insensitive
    expect(a.ok && !a.cached).toBe(true)
    expect(b.ok && b.cached).toBe(true)
    expect(synth).toHaveBeenCalledTimes(1)
    if (a.ok && b.ok) {
      expect(new TextDecoder().decode(b.audio)).toBe('AUDIO:Morning! Scoreboard time.')
      expect(a.costMicro).toBe(25 * 40) // 25 chars × $40 per 1M = 1000 micro-USD
      expect(b.costMicro).toBe(0)
    }
  })

  it('logs cost per interaction and reports per-user economics', async () => {
    await speak({ userId: 'u1', coachId: coach.id, text: 'Line one.' })
    await speak({ userId: 'u1', coachId: coach.id, text: 'Line one.' })
    await speak({ userId: 'u1', coachId: coach.id, text: 'Line two, longer.' })
    const s = voiceStats('u1')
    expect(s.user.month.requests).toBe(3)
    expect(s.user.month.cached).toBe(1)
    expect(s.user.month.chars).toBe('Line one.'.length + 'Line two, longer.'.length)
    expect(s.user.month.costUsd).toBeCloseTo((9 + 17) * 40 / 1e6)
    expect(s.global.month.budgetUsd).toBe(100)
  })

  it('falls back to browser speech at the per-user daily cap, without spending', async () => {
    ttsConfig.perUserDailyChars = 20
    const a = await speak({ userId: 'u1', coachId: coach.id, text: 'Twelve chars' })
    const b = await speak({ userId: 'u1', coachId: coach.id, text: 'And this tips it over' })
    const other = await speak({ userId: 'u2', coachId: coach.id, text: 'Other user is fine' })
    expect(a.ok).toBe(true)
    expect(b).toEqual({ ok: false, reason: 'user-cap' })
    expect(other.ok).toBe(true)
    expect(synth).toHaveBeenCalledTimes(2)
    expect(voiceStats('u1').user.month.fallbacks).toBe(1)
  })

  it('falls back at the global daily cap and the monthly budget', async () => {
    ttsConfig.globalDailyChars = 10
    expect(await speak({ userId: 'u1', coachId: coach.id, text: 'Way more than ten characters' })).toEqual({ ok: false, reason: 'global-cap' })
    ttsConfig.globalDailyChars = 1_000_000
    ttsConfig.monthlyBudgetUsd = 0.00001 // 10 micro-USD
    expect(await speak({ userId: 'u1', coachId: coach.id, text: 'Costs 400 micro' })).toEqual({ ok: false, reason: 'budget' })
    expect(synth).not.toHaveBeenCalled()
  })

  it('cache hits still serve when caps are exhausted', async () => {
    await speak({ userId: 'u1', coachId: coach.id, text: 'Cached line' })
    ttsConfig.perUserDailyChars = 1
    const r = await speak({ userId: 'u1', coachId: coach.id, text: 'Cached line' })
    expect(r.ok && r.cached).toBe(true)
  })

  it('falls back cleanly when the provider fails, is missing, or the coach has no voice yet', async () => {
    synth.mockRejectedValueOnce(new Error('boom'))
    expect(await speak({ userId: 'u1', coachId: coach.id, text: 'Hello' })).toEqual({ ok: false, reason: 'provider-error' })
    setProviderForTests(null)
    expect(await speak({ userId: 'u1', coachId: coach.id, text: 'Hello' })).toEqual({ ok: false, reason: 'no-provider' })
    setProviderForTests(fake)
    const other = COACHES[1]
    const keep = other.voiceId
    other.voiceId = null
    try {
      expect(await speak({ userId: 'u1', coachId: other.id, text: 'Hello' })).toEqual({ ok: false, reason: 'no-voice' })
    } finally {
      other.voiceId = keep
    }
    expect(await speak({ userId: 'u1', coachId: coach.id, text: '   ' })).toEqual({ ok: false, reason: 'empty' })
  })

  it('a phone pipeline can ask for 8 kHz mu-law through the same door', async () => {
    synth.mockImplementationOnce(async ({ format }) => ({ audio: new Uint8Array([1, 2, 3]), mime: format === 'ulaw_8000' ? 'audio/basic' : 'audio/mpeg' }))
    const r = await speak({ userId: null, coachId: coach.id, text: 'Hello from the phone', format: 'ulaw_8000' })
    expect(r.ok && r.mime).toBe('audio/basic')
    expect(synth.mock.calls[0][0].format).toBe('ulaw_8000')
  })
})

// restore so other test files see the roster as shipped
afterAll(() => {
  coach.voiceId = original
})
