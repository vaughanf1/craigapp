import * as repo from '../lib/repo.ts'
import { localParts, localDayRange, shiftDate } from '../lib/time.ts'
import type { CoachContext } from './prompt.ts'
import type { CheckIn } from '../lib/types.ts'

/** Consecutive check-in days ending today or yesterday, with one freeze per rolling week (mirrors the app) */
export function currentStreak(checkIns: CheckIn[], today: string): number {
  const dates = new Set(checkIns.map((c) => c.date))
  let cursor = today
  if (!dates.has(cursor)) cursor = shiftDate(cursor, -1)
  let streak = 0
  let daysSinceFreeze = 8
  for (;;) {
    if (dates.has(cursor)) {
      streak++
      daysSinceFreeze++
      cursor = shiftDate(cursor, -1)
    } else if (daysSinceFreeze > 7 && dates.has(shiftDate(cursor, -1))) {
      daysSinceFreeze = 0
      cursor = shiftDate(cursor, -1)
    } else {
      break
    }
  }
  return streak
}

export function buildContext(user: repo.User): CoachContext {
  if (!user.profile) throw new Error('Profile not set')
  const { date: today, time } = localParts(user.timezone)
  const yesterday = shiftDate(today, -1)
  const todayRange = localDayRange(user.timezone, today)
  const yRange = localDayRange(user.timezone, yesterday)
  const food = repo.listFood(user.id, yRange.start)
  const checkIns = repo.listCheckIns(user.id)
  return {
    user,
    profile: user.profile,
    memories: repo.listMemories(user.id).slice(0, 40),
    summaries: repo.listSummaries(user.id, 7),
    checkIns,
    todayFood: food.filter((f) => f.timestamp >= todayRange.start && f.timestamp < todayRange.end),
    yesterdayFood: food.filter((f) => f.timestamp >= yRange.start && f.timestamp < yRange.end),
    today,
    localTime: time,
    streak: currentStreak(checkIns, today),
    weighIns: repo.listWeighIns(user.id),
    actionLog: repo.listActionLog(user.id, shiftDate(today, -6)),
  }
}
