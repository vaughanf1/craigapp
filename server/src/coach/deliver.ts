import { getCoach } from '../../../shared/coaches.ts'
import * as repo from '../lib/repo.ts'
import { env } from '../lib/env.ts'
import { sendPush } from '../lib/push.ts'
import { placeCall } from '../lib/twilio.ts'
import { generateBrief } from './brief.ts'
import type { Delivery, DeliveryKind } from '../lib/types.ts'

/**
 * A "delivery" is one scheduled touch: the brief is generated once, stored,
 * then pushed to the phone (opens the in-app call screen) and/or dialled as
 * a real phone call. Both channels read the same stored brief.
 */
export async function deliver(
  user: repo.User,
  kind: DeliveryKind,
  slot: string,
  channels: string[],
  date: string,
): Promise<Delivery> {
  const brief = await generateBrief(user, kind)
  const delivery = repo.createDelivery(user.id, { date, slot, kind, brief: brief.spoken, channels })
  const coach = getCoach(user.profile?.coachId)

  const results: string[] = []
  if (channels.includes('push')) {
    const sent = await sendPush(user.id, {
      title: brief.pushTitle || `${coach.name} is calling`,
      body: brief.pushBody,
      url: `${env.appUrl}/app/call/${delivery.id}`,
      deliveryId: delivery.id,
      coachId: coach.id,
      kind,
    })
    results.push(`push:${sent}`)
  }
  if (channels.includes('call')) {
    try {
      const call = await placeCall(
        user.phone,
        `${env.publicUrl}/twilio/voice/${delivery.id}`,
        `${env.publicUrl}/twilio/status/${delivery.id}`,
      )
      repo.setDeliveryStatus(delivery.id, 'sent', call.sid)
      results.push(call.simulated ? 'call:simulated' : `call:${call.sid}`)
    } catch (err) {
      console.error('[deliver] call failed', user.id, err)
      results.push('call:failed')
    }
  }
  if (!channels.includes('call')) repo.setDeliveryStatus(delivery.id, 'sent')
  console.log(`[deliver] ${user.id} ${kind}@${slot} ${results.join(' ')}`)
  return repo.getDelivery(delivery.id)!
}
