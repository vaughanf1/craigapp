import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { env } from './lib/env.ts'
import { getDb } from './lib/db.ts'
import { startScheduler } from './scheduler.ts'

getDb()
const app = createApp()
const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Be More server on http://localhost:${info.port}`)
  console.log(`  push: ${env.vapid.enabled ? 'on' : 'off (set VAPID_* keys)'}  calls: ${env.twilio.enabled ? 'on' : 'simulated (set TWILIO_*)'}`)
})
const stopScheduler = startScheduler()

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopScheduler()
    server.close()
    process.exit(0)
  })
}
