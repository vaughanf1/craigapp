import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './lib/env.ts'
import { HttpError } from './routes/middleware.ts'
import auth from './routes/auth.ts'
import me from './routes/me.ts'
import coach from './routes/coach.ts'
import push from './routes/push.ts'
import twilio from './routes/twilio.ts'

export function createApp() {
  const app = new Hono()
  if (!env.isProd) app.use('*', logger())
  app.use('*', cors({
    origin: (origin) => {
      if (!origin) return env.appUrl
      if (origin === env.appUrl || /^http:\/\/localhost(:\d+)?$/.test(origin)) return origin
      return null
    },
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }))

  app.get('/health', (c) => c.json({ ok: true, version: '1.2.0', push: env.vapid.enabled, calls: env.twilio.enabled }))
  app.route('/auth', auth)
  app.route('/me', me)
  app.route('/coach', coach)
  app.route('/push', push)
  app.route('/twilio', twilio)

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400)
    console.error(err)
    return c.json({ error: env.isProd ? 'Something went wrong' : err.message }, 500)
  })
  return app
}
