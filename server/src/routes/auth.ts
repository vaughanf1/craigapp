import { Hono } from 'hono'
import { z } from 'zod'
import { normalisePhone, requestCode, verifyCode, createSession, revokeSession } from '../lib/auth.ts'
import { isValidTimezone } from '../lib/time.ts'
import * as repo from '../lib/repo.ts'
import { requireUser, type Env } from './middleware.ts'

const app = new Hono<Env>()

const Phone = z.object({ phone: z.string().min(6).max(30), country: z.string().regex(/^\+\d{1,3}$/).optional() })

app.post('/request-code', async (c) => {
  const body = Phone.safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid phone number' }, 400)
  const phone = normalisePhone(body.data.phone, body.data.country)
  if (!phone) return c.json({ error: 'Invalid phone number' }, 400)
  const { dev } = await requestCode(phone)
  return c.json({ ok: true, phone, dev })
})

app.post('/verify', async (c) => {
  const body = Phone.extend({ code: z.string().min(4).max(8), timezone: z.string().optional() }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid request' }, 400)
  const phone = normalisePhone(body.data.phone, body.data.country)
  if (!phone) return c.json({ error: 'Invalid phone number' }, 400)
  if (!(await verifyCode(phone, body.data.code))) return c.json({ error: 'Wrong or expired code' }, 401)
  const tz = body.data.timezone && isValidTimezone(body.data.timezone) ? body.data.timezone : 'Europe/London'
  let user = repo.findUserByPhone(phone)
  if (!user) user = repo.createUser(phone, tz)
  else if (user.timezone !== tz) { repo.setTimezone(user.id, tz); user = repo.findUser(user.id)! }
  const token = createSession(user.id)
  return c.json({ token, user: publicUser(user) })
})

app.post('/logout', requireUser, (c) => {
  revokeSession(c.get('token'))
  return c.json({ ok: true })
})

export function publicUser(u: repo.User) {
  return { id: u.id, phone: u.phone, timezone: u.timezone, profile: u.profile, createdAt: u.createdAt }
}

export default app
