import { Hono } from 'hono'
import { z } from 'zod'
import * as repo from '../lib/repo.ts'
import { reply } from '../coach/chat.ts'
import { deliver } from '../coach/deliver.ts'
import { remember } from '../coach/memory.ts'
import { generateRoadmap } from '../coach/roadmap.ts'
import { reviewPlan, assessStanding } from '../coach/review.ts'
import { buildWarMapInBackground } from '../coach/warmap.ts'
import { localParts as lp } from '../lib/time.ts'
import { localParts } from '../lib/time.ts'
import { env } from '../lib/env.ts'
import { requireUser, requireProfile, type Env } from './middleware.ts'
import { speak, voiceStats } from '../audio/speak.ts'
import { liveCallSession, liveCallsEnabled } from '../audio/live.ts'
import { rememberLater } from '../coach/memory.ts'

const app = new Hono<Env>()
app.use('*', requireUser)

/** Chat or in-app call turn */
app.post('/message', async (c) => {
  const user = requireProfile(c)
  const body = z.object({ text: z.string().min(1).max(4000), channel: z.enum(['chat', 'call']).default('chat'), mode: z.enum(['wrap-up']).optional() }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid message' }, 400)
  const text = await reply(user, body.data.text, body.data.channel, body.data.mode)
  return c.json({ reply: text })
})

/** "Call me now" — generates a brief and delivers it on the chosen channels immediately */
app.post('/call-now', async (c) => {
  const user = requireProfile(c)
  const body = z.object({ channels: z.array(z.enum(['push', 'call'])).default(['push']) }).safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) return c.json({ error: 'Invalid request' }, 400)
  const { date } = localParts(user.timezone)
  const d = await deliver(user, 'manual', 'manual', body.data.channels, date)
  return c.json(d)
})

app.get('/deliveries', (c) => c.json(repo.listDeliveries(c.get('user').id)))

/**
 * Start a live two-way voice call in the app. Returns a short-lived ElevenLabs
 * conversation token plus the per-call persona/context/opening-line overrides.
 * 503 when live calls aren't configured — the client falls back to speak-and-listen.
 */
app.post('/live-call', async (c) => {
  const user = requireProfile(c)
  if (!liveCallsEnabled()) return c.json({ error: 'Live calls are not configured' }, 503)
  const body = z.object({ deliveryId: z.string().optional() }).safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) return c.json({ error: 'Invalid request' }, 400)
  const d = body.data.deliveryId ? repo.getDelivery(body.data.deliveryId) : null
  if (d && d.userId !== user.id) return c.json({ error: 'Not found' }, 404)
  if (d && d.status !== 'answered') repo.setDeliveryStatus(d.id, 'answered')
  try {
    return c.json(await liveCallSession(user, d))
  } catch (err) {
    console.error('[live-call]', err)
    return c.json({ error: 'Live call unavailable' }, 503)
  }
})

/** Each turn of a live call, as the browser hears it, so the call lands in memory like any other conversation */
app.post('/live-call/turn', async (c) => {
  const user = requireProfile(c)
  const body = z.object({ role: z.enum(['user', 'coach']), text: z.string().min(1).max(4000) }).safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) return c.json({ error: 'Invalid request' }, 400)
  repo.addMessage(user.id, body.data.role, body.data.text, 'call')
  if (body.data.role === 'user') rememberLater(user.id)
  return c.json({ ok: true })
})

/**
 * The coach's voice for one line. 200 + audio when the provider served it (from
 * cache or fresh); 204 + X-Voice-Fallback when the app should use browser speech.
 */
app.post('/speak', async (c) => {
  const user = requireProfile(c)
  const body = z.object({ text: z.string().min(1).max(2000) }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid text' }, 400)
  const r = await speak({ userId: user.id, coachId: user.profile.coachId, text: body.data.text })
  if (!r.ok) return c.body(null, 204, { 'X-Voice-Fallback': r.reason })
  return c.body(r.audio.buffer.slice(r.audio.byteOffset, r.audio.byteOffset + r.audio.byteLength) as ArrayBuffer, 200, {
    'Content-Type': r.mime,
    'Cache-Control': 'private, max-age=86400',
    'X-Voice-Cached': r.cached ? '1' : '0',
    'X-Voice-Cost-Micro': String(r.costMicro),
  })
})

/** What voice is costing: this user this month and today, and the service against its budget */
app.get('/speak/stats', (c) => c.json(voiceStats(c.get('user').id)))

/** Call limits, so the in-app call keeps to the same rules as the phone call */
app.get('/call-limits', (c) => c.json(env.call))

app.get('/deliveries/:id', (c) => {
  const d = repo.getDelivery(c.req.param('id'))
  if (!d || d.userId !== c.get('user').id) return c.json({ error: 'Not found' }, 404)
  return c.json(d)
})

/**
 * The person tapped "Accept" on the in-app call screen. Mark it answered and
 * seed the conversation with the brief, so their reply continues naturally.
 */
app.post('/deliveries/:id/answer', (c) => {
  const user = c.get('user')
  const d = repo.getDelivery(c.req.param('id'))
  if (!d || d.userId !== user.id) return c.json({ error: 'Not found' }, 404)
  if (d.status !== 'answered') {
    repo.setDeliveryStatus(d.id, 'answered')
    repo.addMessage(user.id, 'coach', d.brief, 'call')
  }
  return c.json({ ok: true, brief: d.brief })
})

app.post('/deliveries/:id/missed', (c) => {
  const d = repo.getDelivery(c.req.param('id'))
  if (!d || d.userId !== c.get('user').id) return c.json({ error: 'Not found' }, 404)
  if (d.status !== 'answered') repo.setDeliveryStatus(d.id, 'missed')
  return c.json({ ok: true })
})

/** Build (or rebuild) the reverse-engineered plan and store it on the profile */
app.post('/roadmap', async (c) => {
  const user = requireProfile(c)
  const roadmap = await generateRoadmap(user)
  repo.saveProfile(user.id, { ...user.profile, plan: { ...user.profile.plan, roadmap } })
  // The strategic layer builds itself from here — no button needed
  buildWarMapInBackground(repo.findUser(user.id)!)
  return c.json(roadmap)
})

/* ---------- war map & board ---------- */

app.get('/warmap', (c) => {
  const user = c.get('user')
  const stored = repo.getWarMap(user.id)
  // Nothing yet but a plan exists (e.g. older account): start building
  if (stored.status === 'none' && user.profile?.plan.roadmap) {
    buildWarMapInBackground(user)
    return c.json({ status: 'building', progress: 'Drafting the map', map: null, tasks: [] })
  }
  return c.json({ status: stored.status, progress: stored.progress, map: stored.map, tasks: repo.listTasks(user.id) })
})

app.post('/warmap/rebuild', (c) => {
  const user = requireProfile(c)
  buildWarMapInBackground(user)
  return c.json({ status: 'building' })
})

app.post('/tasks', async (c) => {
  const user = c.get('user')
  const body = z.object({
    title: z.string().min(1).max(120),
    detail: z.string().max(500).default(''),
    due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    effort: z.enum(['S', 'M', 'L']).default('M'),
    phaseId: z.string().nullable().default(null),
  }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid task' }, 400)
  return c.json(repo.addTask(user.id, { ...body.data, status: 'todo', source: 'user' }))
})

app.put('/tasks/:id', async (c) => {
  const user = c.get('user')
  const body = z.object({
    title: z.string().min(1).max(120).optional(),
    detail: z.string().max(500).optional(),
    due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    status: z.enum(['todo', 'doing', 'done', 'skipped']).optional(),
    effort: z.enum(['S', 'M', 'L']).optional(),
  }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid task' }, 400)
  const t = repo.updateTask(user.id, c.req.param('id'), body.data)
  return t ? c.json(t) : c.json({ error: 'Not found' }, 404)
})

app.delete('/tasks/:id', (c) => {
  repo.deleteTask(c.get('user').id, c.req.param('id'))
  return c.json({ ok: true })
})

/** Run the adaptive review now (the Goal page's "Review my plan") */
app.post('/review', async (c) => {
  const user = requireProfile(c)
  if (!user.profile.plan.roadmap) return c.json({ error: 'Build a plan first' }, 409)
  const review = await reviewPlan(user, 'manual')
  const fresh = repo.findUser(user.id)!
  return c.json({ review, roadmap: fresh.profile!.plan.roadmap })
})

app.get('/reviews', (c) => {
  const user = c.get('user')
  const { date } = lp(user.timezone)
  return c.json({ reviews: repo.listReviews(user.id), standing: assessStanding(user, date) })
})

/* ---------- memory ---------- */

app.get('/memory', (c) => {
  const u = c.get('user')
  return c.json({ memories: repo.listMemories(u.id), days: repo.listSummaries(u.id, 30), intake: repo.listIntake(u.id) })
})

app.delete('/memory/:id', (c) => {
  repo.archiveMemory(c.get('user').id, c.req.param('id'))
  return c.json({ ok: true })
})

/** Force extraction now (the app calls this when the user leaves the chat) */
app.post('/memory/refresh', async (c) => {
  const result = await remember(c.get('user').id)
  return c.json(result)
})

export default app
