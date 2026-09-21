import { Hono } from 'hono'
import { z } from 'zod'
import * as repo from '../lib/repo.ts'
import { isValidTimezone } from '../lib/time.ts'
import { env } from '../lib/env.ts'
import { requireUser, type Env } from './middleware.ts'
import { publicUser } from './auth.ts'
import { getCoach } from '../../shared/coaches.ts'
import { accountability } from '../../shared/pricing.ts'
import { localParts } from '../lib/time.ts'

const app = new Hono<Env>()
app.use('*', requireUser)

/** Everything the app needs to hydrate after sign-in */
app.get('/', (c) => {
  const u = c.get('user')
  return c.json({
    user: publicUser(u),
    checkIns: repo.listCheckIns(u.id),
    foodLog: repo.listFood(u.id, Date.now() - 90 * 86400_000),
    weighIns: repo.listWeighIns(u.id),
    actionLog: repo.listActionLog(u.id, new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)),
    chat: repo.recentMessages(u.id, 200).map((m) => ({ id: m.id, from: m.role, text: m.text, timestamp: m.ts, channel: m.channel })),
    schedule: repo.getSchedule(u.id),
    memoryCount: repo.listMemories(u.id).length,
    push: { enabled: env.vapid.enabled, publicKey: env.vapid.publicKey },
    calls: { enabled: env.twilio.enabled && Boolean(env.twilio.fromNumber) },
  })
})

const Plan = z.object({
  statement: z.string(),
  benefits: z.array(z.string()),
  supporters: z.array(z.string()),
  obstacles: z.array(z.string()),
  skills: z.array(z.string()),
  actionPlan: z.string(),
  targetDate: z.string(),
  milestone: z.string().optional(),
  roadmap: z.any().optional(),
})
const Profile = z.object({
  name: z.string().min(1).max(60),
  dob: z.string(),
  areaId: z.enum(['health', 'wealth', 'career', 'family', 'personal', 'spirituality', 'lifestyle', 'community', 'habits', 'legacy']),
  areaIds: z.array(z.enum(['health', 'wealth', 'career', 'family', 'personal', 'spirituality', 'lifestyle', 'community', 'habits', 'legacy'])).max(10).optional(),
  coachId: z.string(),
  accent: z.enum(['british', 'american']),
  voiceEnabled: z.boolean(),
  checkInsPerDay: z.number().int().min(1).max(5),
  plan: Plan,
  createdAt: z.number(),
  sex: z.enum(['male', 'female']).optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  goalWeightKg: z.number().optional(),
  calorieTarget: z.number().optional(),
  weightUnit: z.enum(['stone', 'lbs', 'kg']).optional(),
}).passthrough()

app.put('/profile', async (c) => {
  const body = Profile.safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid profile', issues: body.error.issues }, 400)
  const profile = { ...body.data, coachId: getCoach(body.data.coachId).id }
  // Strip anything the client should never send to the server (e.g. a BYO API key from the local-only mode)
  delete (profile as Record<string, unknown>).aiApiKey
  repo.saveProfile(c.get('user').id, profile)
  return c.json({ ok: true })
})

app.put('/timezone', async (c) => {
  const { timezone } = (await c.req.json()) as { timezone?: string }
  if (!timezone || !isValidTimezone(timezone)) return c.json({ error: 'Invalid timezone' }, 400)
  repo.setTimezone(c.get('user').id, timezone)
  return c.json({ ok: true })
})

app.post('/checkins', async (c) => {
  const body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), wentWell: z.boolean(), note: z.string().max(2000) }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid check-in' }, 400)
  const u = c.get('user')
  repo.upsertCheckIn(u.id, body.data)
  // A check-in is a conversation too: it feeds memory and the day summary
  repo.addMessage(u.id, 'user', `Check-in (${body.data.wentWell ? 'good day' : 'tough day'}): ${body.data.note || 'no note'}`, 'chat')
  const { rememberLater } = await import('../coach/memory.ts')
  rememberLater(u.id)
  return c.json({ ok: true })
})

app.post('/food', async (c) => {
  const body = z.object({ id: z.string(), label: z.string().max(200), calories: z.number(), kind: z.enum(['food', 'exercise']), timestamp: z.number() }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid entry' }, 400)
  repo.addFood(c.get('user').id, body.data)
  return c.json({ ok: true })
})

app.post('/weighins', async (c) => {
  const body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kg: z.number().min(20).max(400) }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid weigh-in' }, 400)
  repo.upsertWeighIn(c.get('user').id, body.data)
  return c.json({ ok: true })
})

app.post('/actions', async (c) => {
  const body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), actionId: z.string().max(20), done: z.boolean() }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid action' }, 400)
  repo.setAction(c.get('user').id, body.data)
  return c.json({ ok: true })
})

/** Snap a meal: base64 image in, items + calories out. The app logs what the user confirms. */
app.post('/food/photo', async (c) => {
  const user = c.get('user')
  const body = z.object({
    image: z.string().min(100).max(6_000_000),
    mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
    note: z.string().max(300).default(''),
  }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Send a photo (jpeg/png/webp, under ~4 MB)' }, 400)
  const { analyseMealPhoto } = await import('../coach/food.ts')
  const base64 = body.data.image.replace(/^data:[^;]+;base64,/, '')
  const analysis = await analyseMealPhoto(user, { mediaType: body.data.mediaType, base64 }, body.data.note)
  return c.json(analysis)
})

app.delete('/food/:id', (c) => {
  repo.removeFood(c.get('user').id, c.req.param('id'))
  return c.json({ ok: true })
})

/** This month's answered/missed tally and what it does to next month's price */
app.get('/accountability', (c) => {
  const u = c.get('user')
  const month = localParts(u.timezone).date.slice(0, 7)
  return c.json(accountability(month, repo.monthDeliveryStatuses(u.id, month)))
})

app.get('/schedule', (c) => c.json(repo.getSchedule(c.get('user').id)))

app.put('/schedule', async (c) => {
  const body = z.object({
    times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(5),
    channels: z.array(z.enum(['push', 'call'])),
    enabled: z.boolean(),
  }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid schedule' }, 400)
  const s = { ...body.data, times: [...new Set(body.data.times)].sort() }
  repo.saveSchedule(c.get('user').id, s)
  return c.json(s)
})

app.get('/export', (c) => {
  const u = c.get('user')
  return c.json({
    user: publicUser(u),
    checkIns: repo.listCheckIns(u.id),
    foodLog: repo.listFood(u.id),
    messages: repo.recentMessages(u.id, 5000),
    memories: repo.listMemories(u.id),
    days: repo.listSummaries(u.id, 3650),
    warmap: repo.getWarMap(u.id).map,
    tasks: repo.listTasks(u.id),
    schedule: repo.getSchedule(u.id),
  })
})

app.delete('/', (c) => {
  repo.deleteUser(c.get('user').id)
  return c.json({ ok: true })
})

export default app
