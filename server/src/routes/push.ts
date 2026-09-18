import { Hono } from 'hono'
import { z } from 'zod'
import * as repo from '../lib/repo.ts'
import { env } from '../lib/env.ts'
import { requireUser, type Env } from './middleware.ts'

const app = new Hono<Env>()

app.get('/vapid', (c) => c.json({ enabled: env.vapid.enabled, publicKey: env.vapid.publicKey }))

app.post('/subscribe', requireUser, async (c) => {
  const body = z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }).safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Invalid subscription' }, 400)
  repo.addPushSub(c.get('user').id, body.data.endpoint, body.data.keys)
  return c.json({ ok: true })
})

app.post('/unsubscribe', requireUser, async (c) => {
  const { endpoint } = (await c.req.json()) as { endpoint?: string }
  if (endpoint) repo.removePushSub(endpoint)
  return c.json({ ok: true })
})

export default app
