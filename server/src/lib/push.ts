import webpush from 'web-push'
import { env } from './env.ts'
import * as repo from './repo.ts'

let configured = false
function setup() {
  if (configured || !env.vapid.enabled) return
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url: string
  deliveryId?: string
  coachId?: string
  kind?: string
}

/** Send to every device the user registered; prune subscriptions the browser has revoked. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!env.vapid.enabled) {
    console.log(`[push:simulated] ${userId} ← ${payload.title}: ${payload.body} (${payload.url})`)
    return 0
  }
  setup()
  const subs = repo.listPushSubs(userId)
  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 600, urgency: 'high' })
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) repo.removePushSub(s.endpoint)
      else console.error('[push] failed', s.endpoint.slice(0, 40), status ?? err)
    }
  }))
  return sent
}
