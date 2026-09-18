import * as repo from './lib/repo.ts'
import { localParts } from './lib/time.ts'
import { deliver } from './coach/deliver.ts'
import { assessStanding, reviewPlan, reviewTrigger } from './coach/review.ts'
import type { DeliveryKind } from './lib/types.ts'

const REVIEW_TIME = '03:00'

/** Users whose local clock reads 03:00 and who are due a plan review tonight. Pure — used by tests. */
export function reviewsDue(users: ReturnType<typeof repo.allUsersWithSchedules>, now = new Date()) {
  const due: { user: repo.User; trigger: 'weekly' | 'behind' }[] = []
  for (const u of users) {
    if (!u.profile?.plan.roadmap) continue
    const { date, time } = localParts(u.timezone, now)
    if (time !== REVIEW_TIME || repo.hasReview(u.id, date)) continue
    const standing = assessStanding(u, date)
    const trigger = standing && reviewTrigger(standing)
    if (trigger) due.push({ user: u, trigger })
  }
  return due
}

/**
 * Every minute: for each user whose local clock has just reached one of their
 * check-in times, generate and send their brief. Idempotent per (user, date, slot)
 * so restarts and overlapping ticks can't double-call anyone.
 */

export function kindForSlot(slot: string, times: string[]): DeliveryKind {
  const sorted = [...times].sort()
  if (sorted.length === 1) return Number(slot.slice(0, 2)) < 14 ? 'morning' : 'evening'
  return slot === sorted[sorted.length - 1] ? 'evening' : 'morning'
}

/** Which (user, slot) pairs are due at `now`. Pure — used by tests. */
export function dueNow(users: ReturnType<typeof repo.allUsersWithSchedules>, now = new Date()) {
  const due: { user: repo.User; slot: string; date: string; kind: DeliveryKind; channels: string[] }[] = []
  for (const u of users) {
    if (!u.profile || !u.schedule.enabled) continue
    const { date, time } = localParts(u.timezone, now)
    for (const slot of u.schedule.times) {
      if (slot !== time) continue
      if (repo.hasDelivery(u.id, date, slot)) continue
      due.push({ user: u, slot, date, kind: kindForSlot(slot, u.schedule.times), channels: u.schedule.channels })
    }
  }
  return due
}

export async function tick(now = new Date()): Promise<number> {
  const users = repo.allUsersWithSchedules()
  const due = dueNow(users, now)
  await Promise.all(due.map(async (d) => {
    try {
      await deliver(d.user, d.kind, d.slot, d.channels, d.date)
    } catch (err) {
      console.error('[scheduler] delivery failed', d.user.id, d.slot, err)
    }
  }))
  // Overnight: re-plan for anyone due a review, so the morning call can explain it
  const reviews = reviewsDue(users, now)
  await Promise.all(reviews.map(async (r) => {
    try {
      const result = await reviewPlan(r.user, r.trigger)
      console.log(`[review] ${r.user.id} ${r.trigger} → ${result.decision}${result.changes.length ? ': ' + result.changes.join('; ') : ''}`)
    } catch (err) {
      console.error('[review] failed', r.user.id, err)
    }
  }))
  return due.length + reviews.length
}

export function startScheduler(): () => void {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try { await tick() } finally { running = false }
  }
  // Align to the top of each minute so HH:MM matching is exact
  const msToNextMinute = 60_000 - (Date.now() % 60_000)
  let interval: NodeJS.Timeout | null = null
  const timeout = setTimeout(() => {
    run()
    interval = setInterval(run, 60_000)
  }, msToNextMinute)
  console.log('[scheduler] started')
  return () => {
    clearTimeout(timeout)
    if (interval) clearInterval(interval)
  }
}
