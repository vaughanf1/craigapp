/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { openDb, useDb } from '../src/lib/db.ts'
import { setClientForTests } from '../src/coach/client.ts'
import { createApp } from '../src/app.ts'
import * as repo from '../src/lib/repo.ts'
import { dueNow, tick } from '../src/scheduler.ts'
import { remember } from '../src/coach/memory.ts'
import { localParts } from '../src/lib/time.ts'

/** A stand-in for Claude: chat replies echo, structured calls return canned objects */
const parseMock = vi.fn()
const createMock = vi.fn()
const fakeClient = {
  beta: { messages: { create: createMock } },
  messages: { parse: parseMock },
} as unknown as Anthropic

const app = createApp()
const api = (path: string, init: RequestInit = {}, token?: string) =>
  app.request(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  })

const profile = {
  name: 'Craig', dob: '1963-04-02', areaId: 'health', coachId: 'maya', accent: 'british', voiceEnabled: true,
  checkInsPerDay: 2, createdAt: Date.now(), sex: 'male', heightCm: 180, weightKg: 83.5, goalWeightKg: 70, calorieTarget: 1800,
  plan: { statement: 'Get to 11 stone', benefits: ['Feel great'], supporters: ['Terry'], obstacles: ['Cakes', 'Hates the gym'], skills: [], actionPlan: '', targetDate: '2027-01-01' },
}

let token = ''

beforeAll(() => {
  useDb(openDb(':memory:'))
  setClientForTests(fakeClient)
})

describe('sign-in', () => {
  it('requests a code and verifies it (dev OTP)', async () => {
    const r1 = await api('/auth/request-code', { method: 'POST', body: JSON.stringify({ phone: '07700 900123' }) })
    expect(r1.status).toBe(200)
    expect(await r1.json() as any).toMatchObject({ phone: '+447700900123', dev: true })

    const bad = await api('/auth/verify', { method: 'POST', body: JSON.stringify({ phone: '07700 900123', code: '000000' }) })
    expect(bad.status).toBe(401)

    const r2 = await api('/auth/verify', { method: 'POST', body: JSON.stringify({ phone: '07700 900123', code: '123456', timezone: 'Europe/London' }) })
    expect(r2.status).toBe(200)
    const body = await r2.json() as any
    token = body.token
    expect(body.user.phone).toBe('+447700900123')
  })
  it('rejects requests without a session', async () => {
    expect((await api('/me')).status).toBe(401)
  })
})

describe('profile, schedule, data', () => {
  it('saves the profile and strips any client-side API key', async () => {
    const r = await api('/me/profile', { method: 'PUT', body: JSON.stringify({ ...profile, aiApiKey: 'sk-should-not-be-stored' }) }, token)
    expect(r.status).toBe(200)
    const me = await (await api('/me', {}, token)).json() as any
    expect(me.user.profile.name).toBe('Craig')
    expect(me.user.profile.aiApiKey).toBeUndefined()
    expect(me.schedule).toEqual({ times: ['09:00', '19:00'], channels: ['push'], enabled: true })
  })
  it('sets call times and channels', async () => {
    const r = await api('/me/schedule', { method: 'PUT', body: JSON.stringify({ times: ['21:00', '08:15', '08:15'], channels: ['push', 'call'], enabled: true }) }, token)
    expect(await r.json() as any).toEqual({ times: ['08:15', '21:00'], channels: ['push', 'call'], enabled: true })
    const bad = await api('/me/schedule', { method: 'PUT', body: JSON.stringify({ times: ['25:00'], channels: [], enabled: true }) }, token)
    expect(bad.status).toBe(400)
  })
  it('logs food and check-ins', async () => {
    await api('/me/food', { method: 'POST', body: JSON.stringify({ id: 'f1', label: 'Porridge', calories: 350, kind: 'food', timestamp: Date.now() }) }, token)
    await api('/me/checkins', { method: 'POST', body: JSON.stringify({ date: localParts('Europe/London').date, wentWell: true, note: 'Walked the dog, skipped the cake' }) }, token)
    const me = await (await api('/me', {}, token)).json() as any
    expect(me.foodLog).toHaveLength(1)
    expect(me.checkIns).toHaveLength(1)
  })
})

describe('coach brain', () => {
  it('answers a chat message with the persona and the user\'s context in the prompt', async () => {
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Porridge is a great start, Craig. What\'s the plan for lunch?' }] })
    const r = await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'Had porridge for breakfast' }) }, token)
    expect(r.status).toBe(200)
    expect((await r.json() as any).reply).toContain('Porridge')

    const call = createMock.mock.calls[0][0]
    expect(call.model).toBe('claude-opus-5')
    expect(call.fallbacks).toEqual([{ model: 'claude-opus-4-8' }])
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(call.system[0].text).toContain('You are Maya')
    expect(call.system[0].text).toContain('NOT going to try to make up for yesterday')
    expect(call.system[1].text).toContain('13 stone 2')      // weight in the user's units
    expect(call.system[1].text).toContain('Goal weight: 11 stone\n')
    expect(call.system[1].text).toContain('Halfway milestone: 12 stone 2')
    expect(call.system[1].text).toContain('Hates the gym')
    expect(call.system[1].text).toContain('Porridge')
    expect(call.messages.at(-1)).toEqual({ role: 'user', content: 'Had porridge for breakfast' })
  })

  it('extracts memories and a day summary from the conversation', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        add: [
          { kind: 'preference', text: 'Has porridge for breakfast most days.', importance: 2 },
          { kind: 'struggle', text: 'Cake at the office is the main temptation.', importance: 3 },
        ],
        archive: [],
        day: { summary: 'A solid start with porridge and a dog walk.', mood: 'upbeat', wins: 'Skipped the cake', struggles: '', tomorrowFocus: 'Log lunch before eating it' },
      },
    })
    const result = await remember(repo.findUserByPhone('+447700900123')!.id)
    expect(result).toEqual({ added: 2, archived: 0 })

    const mem = await (await api('/coach/memory', {}, token)).json() as any
    expect(mem.memories.map((m: { text: string }) => m.text)).toContain('Cake at the office is the main temptation.')
    expect(mem.days[0].tomorrowFocus).toBe('Log lunch before eating it')

    // Nothing left to memorise → no API call
    parseMock.mockClear()
    expect(await remember(repo.findUserByPhone('+447700900123')!.id)).toEqual({ added: 0, archived: 0 })
    expect(parseMock).not.toHaveBeenCalled()
  })

  it('feeds memories back into the next reply', async () => {
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'Lunch was a salad' }) }, token)
    const call = createMock.mock.calls.at(-1)![0]
    expect(call.system[1].text).toContain('[struggle] Cake at the office is the main temptation.')
    expect(call.system[1].text).toContain('Log lunch before eating it')
  })

  it('lets the user delete a memory', async () => {
    const mem = await (await api('/coach/memory', {}, token)).json() as any
    const id = mem.memories[0].id
    await api(`/coach/memory/${id}`, { method: 'DELETE' }, token)
    const after = await (await api('/coach/memory', {}, token)).json() as any
    expect(after.memories.find((m: { id: string }) => m.id === id)).toBeUndefined()
  })
})

describe('deliveries — the call', () => {
  const brief = { spoken: 'Morning Craig. Yesterday you came in at 1,650 against 1,800 — cooking on gas. Today, the office cake: one slice, not three. What time is lunch?', pushTitle: 'Maya is calling', pushBody: 'Yesterday: 1,650 of 1,800. Nice.', tomorrowFocus: '' }

  it('"call me now" generates a brief and records the delivery', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: brief })
    const r = await api('/coach/call-now', { method: 'POST', body: JSON.stringify({ channels: ['push', 'call'] }) }, token)
    expect(r.status).toBe(200)
    const d = await r.json() as any
    expect(d.kind).toBe('manual')
    expect(d.brief).toContain('cooking on gas')
    expect(d.status).toBe('sent') // simulated call without Twilio still marks as sent

    const answered = await api(`/coach/deliveries/${d.id}/answer`, { method: 'POST' }, token)
    expect((await answered.json() as any).brief).toBe(brief.spoken)
    const again = await (await api(`/coach/deliveries/${d.id}`, {}, token)).json() as any
    expect(again.status).toBe('answered')
  })

  it('the scheduler fires exactly once per user per slot', async () => {
    const user = repo.findUserByPhone('+447700900123')!
    const { time, date } = localParts(user.timezone)
    repo.saveSchedule(user.id, { times: [time], channels: ['push'], enabled: true })

    const due = dueNow(repo.allUsersWithSchedules())
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({ slot: time, date, kind: Number(time.slice(0, 2)) < 14 ? 'morning' : 'evening' })

    parseMock.mockResolvedValueOnce({ parsed_output: { ...brief, spoken: 'Scheduled brief' } })
    expect(await tick()).toBe(1)
    expect(await tick()).toBe(0) // idempotent
    const list = await (await api('/coach/deliveries', {}, token)).json() as any
    expect(list[0].brief).toBe('Scheduled brief')
  })

  it('phone call webhook speaks the brief, then loops replies through the coach', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: brief })
    const d = await (await api('/coach/call-now', { method: 'POST', body: JSON.stringify({ channels: ['call'] }) }, token)).json() as any

    const voice = await app.request(`/twilio/voice/${d.id}`, { method: 'POST', body: new URLSearchParams({ CallSid: 'CA1', AnsweredBy: 'human' }) })
    const xml = await voice.text()
    expect(voice.headers.get('content-type')).toContain('text/xml')
    expect(xml).toContain('voice="Polly.Amy-Neural"')
    expect(xml).toContain('cooking on gas')
    expect(xml).toContain(`/twilio/gather/${d.id}?t=1`)

    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'One o\'clock it is. Speak tonight.' }] })
    const g1 = await app.request(`/twilio/gather/${d.id}?t=1`, { method: 'POST', body: new URLSearchParams({ SpeechResult: 'Lunch is at one' }) })
    const x1 = await g1.text()
    expect(x1).toContain('One o&apos;clock it is')
    expect(x1).toContain(`?t=2`)
    expect(createMock.mock.calls.at(-1)![0].system[1].text).toContain('PHONE CALL')

    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Brilliant. Goodbye for now.' }] })
    const g2 = await app.request(`/twilio/gather/${d.id}?t=2`, { method: 'POST', body: new URLSearchParams({ SpeechResult: 'Thanks, bye' }) })
    const x2 = await g2.text()
    expect(x2).not.toContain('<Gather')
    expect(x2).toContain('<Hangup/>')

    // voicemail: leave the brief and hang up
    parseMock.mockResolvedValueOnce({ parsed_output: brief })
    const d2 = await (await api('/coach/call-now', { method: 'POST', body: JSON.stringify({ channels: ['call'] }) }, token)).json() as any
    const vm = await app.request(`/twilio/voice/${d2.id}`, { method: 'POST', body: new URLSearchParams({ CallSid: 'CA2', AnsweredBy: 'machine_start' }) })
    expect(await vm.text()).toContain('<Hangup/>')
    expect((await (await api(`/coach/deliveries/${d2.id}`, {}, token)).json() as any).status).toBe('missed')
  })
})

describe('account', () => {
  it('exports everything and deletes the account', async () => {
    const exp = await (await api('/me/export', {}, token)).json() as any
    expect(exp.memories.length).toBeGreaterThan(0)
    expect(exp.messages.length).toBeGreaterThan(0)
    expect((await api('/me', { method: 'DELETE' }, token)).status).toBe(200)
    expect((await api('/me', {}, token)).status).toBe(401)
  })
})
