import { describe, it, expect } from 'vitest'
import { reviewTrigger, localReview, type Standing } from '../src/coach/review.ts'
import { buildLocalRoadmap } from '../../shared/roadmap.ts'

const base: Standing = { daysToStop: 40, weight: null, actionRate: 0.8, daysWithData: 5, missedCalls7d: 0, daysSinceReview: 2 }
const behindWeight = { targetKg: 77, expectedKg: 81, aheadKg: -1.6, daysLeft: 40, status: 'behind' as const }

describe('when to review', () => {
  it('weekly regardless of standing', () => {
    expect(reviewTrigger({ ...base, daysSinceReview: 7 })).toBe('weekly')
    expect(reviewTrigger(base)).toBeNull()
  })
  it('early when clearly behind, but not two nights running', () => {
    expect(reviewTrigger({ ...base, weight: behindWeight, daysSinceReview: 3 })).toBe('behind')
    expect(reviewTrigger({ ...base, weight: behindWeight, daysSinceReview: 1 })).toBeNull()
    expect(reviewTrigger({ ...base, weight: { ...behindWeight, aheadKg: -0.6 }, daysSinceReview: 5 })).toBeNull()
    expect(reviewTrigger({ ...base, actionRate: 0.2, daysWithData: 3, daysSinceReview: 4 })).toBe('behind')
    expect(reviewTrigger({ ...base, actionRate: 0.2, daysWithData: 2, daysSinceReview: 4 })).toBeNull() // too little data
  })
})

describe('local rules (no Claude)', () => {
  const roadmap = buildLocalRoadmap({ statement: 'Get to 11 stone', targetDate: '2027-01-14', areaId: 'health', today: '2026-09-18', weightKg: 83.5, goalWeightKg: 70 })
  it('keeps the plan when on course', () => {
    const r = localReview(roadmap, base, '2026-09-25')
    expect(r.decision).toBe('keep')
    expect(r.roadmap).toBeNull()
  })
  it('adds a nearer stop when behind on weight', () => {
    const r = localReview(roadmap, { ...base, weight: behindWeight, daysToStop: 32 }, '2026-09-25')
    expect(r.decision).toBe('adjust')
    expect(r.changes[0]).toMatch(/nearer stop on 2026-10-11/)
    expect(r.roadmap!.milestones).toHaveLength(roadmap.milestones.length + 1)
    expect(r.roadmap!.milestones[0].targetDate).toBe('2026-10-11')
    expect(r.roadmap!.milestones[0].metric!.target).toBeLessThan(behindWeight.expectedKg)
    expect(r.coachNote).toContain('Stepping stone')
  })
  it('simplifies to two actions when they are not ticking them', () => {
    const r = localReview(roadmap, { ...base, actionRate: 0.2, daysWithData: 4 }, '2026-09-25')
    expect(r.changes).toContain('Simplified to two daily actions')
    expect(r.roadmap!.dailyActions).toHaveLength(2)
  })
})
