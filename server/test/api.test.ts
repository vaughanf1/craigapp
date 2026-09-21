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

beforeAll(async () => {
  useDb(openDb(':memory:'))
  setClientForTests(fakeClient)
  ;(await import('../src/coach/warmap.ts')).setAutoBuild(false)
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
    expect(me.schedule).toEqual({ times: ['09:00', '19:00'], channels: ['push', 'call'], enabled: true })
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
        actionsDone: [], actionsMissed: [], weighIn: null,
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

describe('the plan & progress', () => {
  it('builds a roadmap with Claude and stores it on the profile', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        summary: 'First stop is 12 stone 2 by the end of October. One stop at a time.',
        milestones: [
          { title: 'First stop: 12 stone 2', targetDate: '2026-10-30', metric: { label: 'Weight', target: 77, unit: 'kg' }, why: 'Halfway feels close.' },
          { title: 'Goal: 11 stone', targetDate: '2027-01-01', metric: { label: 'Weight', target: 70, unit: 'kg' }, why: 'The one you wrote down.' },
        ],
        weeklyCommitments: ['Cake: one slice, not three', 'Both calls, every day'],
        dailyActions: ['Log every meal', 'Walk 20 minutes', 'No food after 9pm'],
      },
    })
    const r = await api('/coach/roadmap', { method: 'POST' }, token)
    expect(r.status).toBe(200)
    const roadmap = await r.json() as any
    expect(roadmap.source).toBe('coach')
    expect(roadmap.dailyActions).toEqual([{ id: 'a1', text: 'Log every meal' }, { id: 'a2', text: 'Walk 20 minutes' }, { id: 'a3', text: 'No food after 9pm' }])
    const me = await (await api('/me', {}, token)).json() as any
    expect(me.user.profile.plan.roadmap.milestones[0].title).toBe('First stop: 12 stone 2')
  })

  it('falls back to the local plan when Claude is unavailable', async () => {
    parseMock.mockRejectedValueOnce(new Error('no key'))
    const roadmap = await (await api('/coach/roadmap', { method: 'POST' }, token)).json() as any
    expect(roadmap.source).toBe('local')
    expect(roadmap.milestones.at(-1).metric.target).toBe(70)
    // restore the coach-built one for the tests below
    parseMock.mockResolvedValueOnce({ parsed_output: { summary: 's', milestones: [{ title: 'First stop', targetDate: '2099-10-30', metric: { label: 'Weight', target: 77, unit: 'kg' }, why: 'w' }], weeklyCommitments: ['c'], dailyActions: ['Log every meal', 'Walk 20 minutes'] } })
    await api('/coach/roadmap', { method: 'POST' }, token)
  })

  it('records weigh-ins and ticked actions, and the coach sees where they stand', async () => {
    const today = localParts('Europe/London').date
    expect((await api('/me/weighins', { method: 'POST', body: JSON.stringify({ date: today, kg: 82.1 }) }, token)).status).toBe(200)
    expect((await api('/me/actions', { method: 'POST', body: JSON.stringify({ date: today, actionId: 'a1', done: true }) }, token)).status).toBe(200)
    expect((await api('/me/weighins', { method: 'POST', body: JSON.stringify({ date: today, kg: 5 }) }, token)).status).toBe(400)

    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'How am I doing?' }) }, token)
    const ctx = createMock.mock.calls.at(-1)![0].system[1].text
    expect(ctx).toContain('THE PLAN')
    expect(ctx).toContain('→ First stop — by 2099-10-30 (12 stone 2)')
    expect(ctx).toContain('Latest weigh-in: 12 stone 13')
    expect(ctx).toContain('[a1] Log every meal — 1/7 days this week, done today')
    expect(ctx).toContain('[a2] Walk 20 minutes — 0/7 days this week')
  })

  it('the evening call records what they say they did', async () => {
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Good.' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'Did my walk, skipped logging lunch, and I was 12 stone 12 this morning', channel: 'call' }) }, token)
    parseMock.mockResolvedValueOnce({ parsed_output: { add: [], archive: [], day: null, actionsDone: ['a2'], actionsMissed: ['a1'], weighIn: 81.6 } })
    await remember(repo.findUserByPhone('+447700900123')!.id)
    const me = await (await api('/me', {}, token)).json() as any
    const today = localParts('Europe/London').date
    expect(me.actionLog).toContainEqual({ date: today, actionId: 'a2', done: true })
    expect(me.actionLog).toContainEqual({ date: today, actionId: 'a1', done: false })
    expect(me.weighIns.at(-1)).toEqual({ date: today, kg: 81.6 })
  })
})

describe('the war map & board', () => {
  it('builds itself in the background once the plan exists, through the draft → board → revise loop', async () => {
    const { buildWarMap } = await import('../src/coach/warmap.ts')
    const user = repo.findUserByPhone('+447700900123')!
    const draft = {
      northStar: 'Craig at 11 stone on 1 January, buying a new suit.',
      strategy: 'Three phases, each ending at a stop.',
      phases: [
        { name: 'Foundations', start: '2026-09-19', end: '2026-10-30', objective: 'Build the logging habit', keyResults: [{ text: 'First stop: 12 stone 2', metric: { label: 'Weight', target: 77, unit: 'kg' } }] },
        { name: 'The push', start: '2026-10-31', end: '2099-10-30', objective: 'Get to goal', keyResults: [{ text: 'Goal weight', metric: { label: 'Weight', target: 70, unit: 'kg' } }] },
      ],
      tasks: [
        { phase: 1, title: 'Clear the biscuit tin', detail: 'Out of sight.', due: '2026-09-21', effort: 'S' },
        { phase: 1, title: 'Tell Terry the goal', detail: 'Accountability.', due: '2026-09-22', effort: 'S' },
        { phase: 1, title: 'Buy bathroom scales', detail: 'Weekly weigh-ins.', due: '2026-09-23', effort: 'S' },
        { phase: 1, title: 'Book a walking route', detail: 'Same loop daily.', due: '2026-09-24', effort: 'S' },
        { phase: 2, title: 'Try on the old suit', detail: 'Proof.', due: null, effort: 'S' },
        { phase: 2, title: 'Plan Christmas food', detail: 'Reduce not ban.', due: '2026-12-15', effort: 'M' },
      ],
      risks: [{ risk: 'Office cake', mitigation: 'One slice, Fridays only.' }],
    }
    parseMock
      .mockResolvedValueOnce({ parsed_output: draft })                                                      // draft 1
      .mockResolvedValueOnce({ parsed_output: { score: 6, verdict: 'Too vague after October.', issues: ['Phase 2 has no tasks in the first two weeks'] } }) // review 1
      .mockResolvedValueOnce({ parsed_output: { ...draft, tasks: [...draft.tasks, { phase: 2, title: 'Book November PT session', detail: 'Momentum.', due: '2026-11-02', effort: 'M' }] } }) // revision
      .mockResolvedValueOnce({ parsed_output: { score: 9, verdict: 'Ready.', issues: [] } })                // review 2
    const { map, tasks } = await buildWarMap(user)
    expect(map.source).toBe('coach')
    expect(map.buildLog.map((b) => b.score)).toEqual([6, 9])
    expect(map.phases).toHaveLength(2)
    expect(tasks).toHaveLength(7)
    expect(tasks.find((t) => t.title === 'Book November PT session')!.phaseId).toBe('p2')

    const r = await (await api('/coach/warmap', {}, token)).json() as any
    expect(r.status).toBe('ready')
    expect(r.map.northStar).toContain('11 stone')
  })

  it('the coach sees the board and the phase on every call', async () => {
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'What should I do this week?' }) }, token)
    const ctx = createMock.mock.calls.at(-1)![0].system[1].text
    expect(ctx).toContain('THE WAR MAP')
    expect(ctx).toContain('Current phase: Foundations')
    expect(ctx).toMatch(/This week:\n- \[\S+\] Clear the biscuit tin \(due 2026-09-21\)/)
  })

  it('what they say on a call ticks tasks and adds new ones', async () => {
    const before = await (await api('/coach/warmap', {}, token)).json() as any
    const tin = before.tasks.find((t: any) => t.title === 'Clear the biscuit tin')
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Great.' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'Biscuit tin is gone, and I will book the dentist on Friday', channel: 'call' }) }, token)
    parseMock.mockResolvedValueOnce({ parsed_output: { add: [], archive: [], day: null, actionsDone: [], actionsMissed: [], weighIn: null, tasksDone: [tin.id], newTasks: [{ title: 'Book the dentist', detail: 'He said Friday.', due: '2026-09-25' }] } })
    await remember(repo.findUserByPhone('+447700900123')!.id)
    const after = await (await api('/coach/warmap', {}, token)).json() as any
    expect(after.tasks.find((t: any) => t.id === tin.id).status).toBe('done')
    const dentist = after.tasks.find((t: any) => t.title === 'Book the dentist')
    expect(dentist).toMatchObject({ source: 'coach', due: '2026-09-25', phaseId: 'p1' })
  })

  it('the person can add, tick and remove tasks', async () => {
    const created = await (await api('/coach/tasks', { method: 'POST', body: JSON.stringify({ title: 'Buy running shoes', due: '2026-09-27' }) }, token)).json() as any
    expect(created.source).toBe('user')
    const done = await (await api(`/coach/tasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) }, token)).json() as any
    expect(done.doneAt).toBeTruthy()
    expect((await api(`/coach/tasks/${created.id}`, { method: 'DELETE' }, token)).status).toBe(200)
  })

  it('a rebuild keeps coach/user tasks and done ones, replacing only open plan tasks', async () => {
    const { buildWarMap } = await import('../src/coach/warmap.ts')
    parseMock.mockRejectedValueOnce(new Error('no key')) // local fallback
    const { map, tasks } = await buildWarMap(repo.findUserByPhone('+447700900123')!)
    expect(map.source).toBe('local')
    expect(map.version).toBe(2)
    expect(map.buildLog).toEqual([])
    expect(tasks.some((t) => t.title === 'Book the dentist')).toBe(true)         // coach-added kept
    expect(tasks.some((t) => t.title === 'Clear the biscuit tin')).toBe(true)    // done kept
    expect(tasks.some((t) => t.title === 'Tell Terry the goal')).toBe(false)     // open plan task replaced
  })
})

describe('adaptive re-planning', () => {
  it('a manual review adjusts the plan and logs why', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        decision: 'adjust',
        reason: 'Two of three actions slipped this week, so the plan gets one easier action.',
        coachNote: "I've tweaked the plan overnight — the walk is now ten minutes, not twenty. Stepping stone, not stopping stone.",
        changes: ['Walk 20 minutes → Walk 10 minutes'],
        roadmap: {
          summary: 'Nearer stops, easier days.',
          milestones: [{ title: 'First stop', targetDate: '2099-10-30', metric: { label: 'Weight', target: 77, unit: 'kg' }, why: 'w' }],
          weeklyCommitments: ['c'],
          dailyActions: ['Log every meal', 'Walk 10 minutes'],
        },
      },
    })
    const r = await api('/coach/review', { method: 'POST' }, token)
    expect(r.status).toBe(200)
    const body = await r.json() as any
    expect(body.review.decision).toBe('adjust')
    expect(body.review.trigger).toBe('manual')
    // unchanged action keeps its id (tick history survives); the changed one gets a new id
    expect(body.roadmap.dailyActions[0]).toEqual({ id: 'a1', text: 'Log every meal' })
    expect(body.roadmap.dailyActions[1].id).not.toBe('a2')

    const list = await (await api('/coach/reviews', {}, token)).json() as any
    expect(list.reviews[0].changes).toEqual(['Walk 20 minutes → Walk 10 minutes'])
    expect(list.standing).toHaveProperty('actionRate')
  })

  it('the next brief explains the change, once', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: { spoken: 'Morning. Small tweak overnight…', pushTitle: 'Maya', pushBody: 'b', tomorrowFocus: '' } })
    await api('/coach/call-now', { method: 'POST', body: JSON.stringify({ channels: [] }) }, token)
    const ctx = parseMock.mock.calls.at(-1)![0].system[1].text
    expect(ctx).toContain("PLAN UPDATE YOU HAVEN'T TOLD THEM YET")
    expect(ctx).toContain('the walk is now ten minutes')

    parseMock.mockResolvedValueOnce({ parsed_output: { spoken: 'Evening.', pushTitle: 'Maya', pushBody: 'b', tomorrowFocus: '' } })
    await api('/coach/call-now', { method: 'POST', body: JSON.stringify({ channels: [] }) }, token)
    expect(parseMock.mock.calls.at(-1)![0].system[1].text).not.toContain('PLAN UPDATE YOU HAVEN')
  })

  it('the nightly job reviews at 03:00 local when due, and only once', async () => {
    const user = repo.findUserByPhone('+447700900123')!
    // Pretend the last review was 8 days ago
    const db = (await import('../src/lib/db.ts')).getDb()
    db.prepare("UPDATE plan_reviews SET date = ? WHERE user_id = ?").run('2020-01-01', user.id)
    const { reviewsDue } = await import('../src/scheduler.ts')
    // 03:00 in the user's timezone, whatever the machine's timezone is (CI runs in UTC)
    const at3am = (() => {
      const d = new Date()
      d.setUTCMinutes(0, 0, 0)
      for (let i = 0; i < 48; i++) {
        if (localParts(user.timezone, d).time === '03:00') return d
        d.setUTCHours(d.getUTCHours() - 1)
      }
      throw new Error('no 03:00 found')
    })()
    const due = reviewsDue(repo.allUsersWithSchedules(), at3am)
    expect(due.map((d) => d.trigger)).toEqual(['weekly'])
    const at4am = new Date(at3am.getTime() + 3600_000)
    expect(reviewsDue(repo.allUsersWithSchedules(), at4am)).toHaveLength(0)

    parseMock.mockResolvedValueOnce({ parsed_output: { decision: 'keep', reason: 'On course.', coachNote: '', changes: [], roadmap: null } })
    expect(await tick(at3am)).toBeGreaterThanOrEqual(1)
    expect(reviewsDue(repo.allUsersWithSchedules(), at3am)).toHaveLength(0) // idempotent per day
    const list = await (await api('/coach/reviews', {}, token)).json() as any
    expect(list.reviews[0]).toMatchObject({ decision: 'keep', trigger: 'weekly' })
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

    // Near the turn cap the coach is told to wrap up, and the call is hard-capped by Twilio
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'One thing today: the walk. Goodbye.' }] })
    await app.request(`/twilio/gather/${d.id}?t=5`, { method: 'POST', body: new URLSearchParams({ SpeechResult: 'And another thing' }) })
    expect(createMock.mock.calls.at(-1)![0].system[1].text).toContain('time is nearly up')

    // voicemail: leave the brief and hang up
    parseMock.mockResolvedValueOnce({ parsed_output: brief })
    const d2 = await (await api('/coach/call-now', { method: 'POST', body: JSON.stringify({ channels: ['call'] }) }, token)).json() as any
    const vm = await app.request(`/twilio/voice/${d2.id}`, { method: 'POST', body: new URLSearchParams({ CallSid: 'CA2', AnsweredBy: 'machine_start' }) })
    expect(await vm.text()).toContain('<Hangup/>')
    expect((await (await api(`/coach/deliveries/${d2.id}`, {}, token)).json() as any).status).toBe('missed')
  })
})

describe('guided discovery', () => {
  it('the coach is told what it still needs to learn and asks one question per call', async () => {
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'Morning' }) }, token)
    const ctx = createMock.mock.calls.at(-1)![0].system[1].text
    expect(ctx).toContain('DISCOVERY')
    expect(ctx).toContain('Still to learn (11)')
    expect(ctx).toContain('ask ONE question to learn: why this goal, really')
    expect(createMock.mock.calls.at(-1)![0].system[0].text).toContain('Diagnose before you prescribe')
    expect(createMock.mock.calls.at(-1)![0].system[0].text).toContain('NOT A YES-MAN')
  })
  it('answers are stored and the next question moves on', async () => {
    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Thanks.' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: "Honestly it's my daughter's wedding in June, I want to look at the photos without wincing", channel: 'call' }) }, token)
    parseMock.mockResolvedValueOnce({ parsed_output: { add: [], archive: [], day: null, actionsDone: [], actionsMissed: [], weighIn: null, tasksDone: [], newTasks: [], discovery: [{ field: 'why', answer: "His daughter's wedding in June — he wants to look at the photos without wincing." }] } })
    await remember(repo.findUserByPhone('+447700900123')!.id)
    const mem = await (await api('/coach/memory', {}, token)).json() as any
    expect(mem.intake.why).toContain('wedding')

    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'Morning' }) }, token)
    const ctx = createMock.mock.calls.at(-1)![0].system[1].text
    expect(ctx).toContain("- Why this goal, really: His daughter's wedding")
    expect(ctx).toContain('Still to learn (10)')
    expect(ctx).toContain('ask ONE question to learn: what success looks like')
  })
})

describe('accountability tally', () => {
  it('unanswered scheduled calls expire to missed, and the coach knows the tally', async () => {
    const user = repo.findUserByPhone('+447700900123')!
    const db = (await import('../src/lib/db.ts')).getDb()
    const month = localParts(user.timezone).date.slice(0, 7)
    // five scheduled calls this month: 1 answered, 1 missed, 3 sent long ago
    const rows = [['answered', 0], ['missed', 0], ['sent', 3 * 3600_000], ['sent', 3 * 3600_000], ['sent', 10 * 60_000]] as const
    rows.forEach(([status, age], i) => {
      db.prepare("INSERT INTO deliveries (id, user_id, date, slot, kind, brief, channels_json, status, created_at) VALUES (?, ?, ?, ?, 'morning', 'b', '[\"call\"]', ?, ?)")
        .run(`acc${i}`, user.id, `${month}-0${i + 1}`, `0${i}:00`, status, Date.now() - age)
    })
    expect(repo.expireUnanswered(2 * 3600_000)).toBe(2)
    const a = await (await api('/me/accountability', {}, token)).json() as any
    expect(a).toMatchObject({ month, answered: 1, missed: 3, missesUntilPenalty: 2, nextMonthPence: 1999 })
    expect(a.pending).toBeGreaterThanOrEqual(1)

    createMock.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
    await api('/coach/message', { method: 'POST', body: JSON.stringify({ text: 'hi' }) }, token)
    const ctx = createMock.mock.calls.at(-1)![0].system[1].text
    expect(ctx).toContain('CALLS THIS MONTH: 1 answered, 3 missed')
    expect(ctx).toContain("2 more missed calls and next month's price goes up")
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
