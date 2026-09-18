import { describe, it, expect } from 'vitest'
import { buildLocalRoadmap, currentMilestone, weightProgress } from '../../shared/roadmap.ts'

const input = {
  statement: 'Get to 11 stone', targetDate: '2027-01-14', areaId: 'health', today: '2026-09-18',
  weightKg: 83.5, goalWeightKg: 70, obstacles: ['Cakes', 'Wine at the weekend'], actionPlan: '',
}

describe('local roadmap', () => {
  it('works backwards from the goal date with real weight numbers at each stop', () => {
    const r = buildLocalRoadmap(input)
    expect(r.milestones).toHaveLength(3) // 118 days → 3 stops
    expect(r.milestones.at(-1)).toMatchObject({ targetDate: '2027-01-14', metric: { target: 70, unit: 'kg' } })
    expect(r.milestones[0].targetDate < r.milestones[1].targetDate).toBe(true)
    expect(r.milestones[1]).toMatchObject({ title: 'Halfway', metric: { target: 74.5 } })
    expect(r.weeklyCommitments[0]).toContain('Cut down (not out) on: Cakes')
    expect(r.dailyActions.map((a) => a.text)).toContain('Log everything you eat and drink')
    expect(r.source).toBe('local')
  })
  it('uses the person\'s own action plan for daily actions when they wrote one', () => {
    const r = buildLocalRoadmap({ ...input, actionPlan: 'Walk the dog every morning, no biscuits at work, gym Tuesday and Thursday' })
    expect(r.dailyActions.map((a) => a.text)).toEqual(['Walk the dog every morning', 'no biscuits at work', 'gym Tuesday'])
  })
  it('handles a goal without numbers or a near date', () => {
    const r = buildLocalRoadmap({ statement: 'Read 3 books', targetDate: '2026-09-28', areaId: 'personal', today: '2026-09-18' })
    expect(r.milestones).toHaveLength(1)
    expect(r.milestones[0].metric).toBeUndefined()
  })
})

describe('progress against the plan', () => {
  const r = buildLocalRoadmap(input)
  it('finds the current stop', () => {
    expect(currentMilestone(r, '2026-09-18').index).toBe(0)
    expect(currentMilestone(r, r.milestones[0].targetDate).index).toBe(0)
    expect(currentMilestone(r, '2027-02-01').current).toBeNull()
  })
  it('says ahead / on track / behind against the expected line', () => {
    const mid = '2026-10-08' // ~half way to the first stop (2026-10-27)
    const onTrack = weightProgress(r, 83.5, 81.2, mid, '2026-09-18')!
    expect(onTrack.status).toBe('on track')
    expect(weightProgress(r, 83.5, 79.5, mid, '2026-09-18')!.status).toBe('ahead')
    const behind = weightProgress(r, 83.5, 83.4, mid, '2026-09-18')!
    expect(behind.status).toBe('behind')
    expect(behind.aheadKg).toBeLessThan(-1)
    expect(behind.daysLeft).toBe(19)
  })
})

describe('several life areas', () => {
  it('draws daily actions from every area, main focus first', () => {
    const r = buildLocalRoadmap({ statement: 'Quit smoking and get my weekends back', targetDate: '2027-01-14', areaId: 'habits', areaIds: ['habits', 'lifestyle', 'family'], today: '2026-09-18' })
    expect(r.dailyActions.map((a) => a.text)).toEqual([
      'Notice the urge, wait ten minutes',
      'Log every slip honestly',
      'One thing purely for enjoyment',
      'One undistracted conversation',
    ])
  })
})
