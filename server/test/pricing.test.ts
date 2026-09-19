import { describe, it, expect } from 'vitest'
import { accountability, pricingRule, PRICING } from '../../shared/pricing.ts'

const st = (answered: number, missed: number, pending = 0) => [
  ...Array(answered).fill('answered'), ...Array(missed).fill('missed'), ...Array(pending).fill('sent'),
]

describe('accountability pricing', () => {
  it('within grace: base price, tells you how many misses are left', () => {
    const a = accountability('2026-09', st(10, 2))
    expect(a).toMatchObject({ missed: 2, missesUntilPenalty: 3, penaltyPence: 0, nextMonthPence: 1999 })
  })
  it('beyond grace: each miss adds £2.50, capped at +£20', () => {
    expect(accountability('2026-09', st(10, 6)).nextMonthPence).toBe(1999 + 500)
    expect(accountability('2026-09', st(0, 40)).nextMonthPence).toBe(1999 + 2000)
    expect(accountability('2026-09', st(10, 6)).missesUntilPenalty).toBe(0)
  })
  it('answering 90%+ of a real month earns the credit', () => {
    expect(accountability('2026-09', st(19, 1)).creditPence).toBe(500)
    expect(accountability('2026-09', st(19, 1)).nextMonthPence).toBe(1499)
    expect(accountability('2026-09', st(9, 1)).creditPence).toBe(0) // too few calls to judge
    expect(accountability('2026-09', st(40, 5)).creditPence).toBe(0) // penalty and credit never stack
  })
  it('unanswered-but-still-open calls are pending, not missed', () => {
    const a = accountability('2026-09', st(3, 1, 2))
    expect(a).toMatchObject({ scheduled: 6, pending: 2, answerRate: 0.75 })
  })
  it('states the rule in one sentence', () => {
    expect(pricingRule()).toBe(`£19.99 a month. Miss more than ${PRICING.graceMissed} calls in a month and each extra miss adds £2.50 to next month (up to £39.99). Answer 90% or more and next month is £5.00 cheaper.`)
  })
})
