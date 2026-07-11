import { describe, expect, it } from 'vitest'
import { currentStreak, todayKey } from './store'
import type { CheckInRecord } from './types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayKey(d)
}

function record(date: string): CheckInRecord {
  return { date, wentWell: true, note: '' }
}

describe('currentStreak', () => {
  it('is 0 with no check-ins', () => {
    expect(currentStreak([])).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    expect(currentStreak([record(daysAgo(2)), record(daysAgo(1)), record(daysAgo(0))])).toBe(3)
  })

  it("doesn't lose the streak before today's check-in happens", () => {
    expect(currentStreak([record(daysAgo(2)), record(daysAgo(1))])).toBe(2)
  })

  it('freezes a single missed day instead of breaking the streak', () => {
    // missed daysAgo(1), but kept daysAgo(2): the miss is frozen
    expect(currentStreak([record(daysAgo(3)), record(daysAgo(2)), record(daysAgo(0))])).toBe(3)
  })

  it('does not freeze two missed days in a row', () => {
    expect(currentStreak([record(daysAgo(3)), record(daysAgo(0))])).toBe(1)
  })

  it('allows at most one freeze per rolling week', () => {
    // two isolated misses within the same 7 days: second one breaks
    const checkIns = [0, 2, 3, 4, 6, 7].map((n) => record(daysAgo(n)))
    // miss at day 1 is frozen; miss at day 5 is within 7 days of that freeze
    expect(currentStreak(checkIns)).toBe(4)
  })

  it('is 0 when the last check-in was three days ago', () => {
    expect(currentStreak([record(daysAgo(3))])).toBe(0)
  })
})
