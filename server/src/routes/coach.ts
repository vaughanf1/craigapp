import { Hono } from 'hono'
import { z } from 'zod'
import * as repo from '../lib/repo.ts'
import { reply } from '../coach/chat.ts'
import { deliver } from '../coach/deliver.ts'
import { remember } from '../coach/memory.ts'
import { generateRoadmap } from '../coach/roadmap.ts'
import { reviewPlan, assessStanding } from '../coach/review.ts'
import { localParts as lp } from '../lib/time.ts'
import { localParts } from '../lib/time.ts'
import { requireUser, requireProfile, type Env } from './middleware.ts'

const app = new Hono<Env>()
app.use('*', requireUser)

/** Chat or in-app call turn */
app.post('/message', async (c) => {
  const user = requireProfile(c)
  const body = z.object({ text: z.string().min(1).max(4000), channel: z.enum(['chat', 'call']).default('chat') }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid message' }, 400)
  const text = await reply(user, body.data.text, body.data.channel)
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
  return c.json(roadmap)
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
  return c.json({ memories: repo.listMemories(u.id), days: repo.listSummaries(u.id, 30) })
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
