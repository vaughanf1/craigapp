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
import { modelName, provider } from './coach/llm.ts'

/** Which model answers, or 'off' when neither provider has a key (scripted fallbacks only) */
function brainStatus(): string {
  if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) return `${provider()}:${modelName()}`
  return 'off'
}

export function createApp() {
  const app = new Hono()
  if (!env.isProd) app.use('*', logger())
  // APP_URL may list several apps (comma-separated) and include paths (GitHub Pages serves under /craigapp) — CORS matches origins
  const appOrigins = env.appUrls.split(',').map((u) => { try { return new URL(u.trim()).origin } catch { return u.trim() } })
  app.use('*', cors({
    origin: (origin) => {
      if (!origin) return appOrigins[0]
      if (appOrigins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) return origin
      return null
    },
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }))

  app.get('/health', (c) => c.json({ ok: true, version: '1.3.0', brain: brainStatus(), push: env.vapid.enabled, calls: env.twilio.enabled }))
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
