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

  it('breaks on a missed day', () => {
    expect(currentStreak([record(daysAgo(3)), record(daysAgo(0))])).toBe(1)
  })

  it('is 0 when the last check-in was two days ago', () => {
    expect(currentStreak([record(daysAgo(2))])).toBe(0)
  })
})
