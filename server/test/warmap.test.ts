import { describe, it, expect } from 'vitest'
import { buildLocalWarMap, boardColumns, currentPhase, planningHorizon, type Task } from '../../shared/warmap.ts'

describe('planning horizon', () => {
  it('runs to the end of the year, or the target date if later, never under 8 weeks', () => {
    expect(planningHorizon('2026-09-19', '2027-01-14')).toEqual({ start: '2026-09-19', end: '2027-01-14' })
    expect(planningHorizon('2026-09-19', '2026-11-01')).toEqual({ start: '2026-09-19', end: '2026-12-31' })
    expect(planningHorizon('2026-12-20', '2026-12-28').end).toBe('2027-02-14')
  })
})

describe('local war map', () => {
  const { map, tasks } = buildLocalWarMap({
    statement: 'Get to 11 stone', targetDate: '2027-01-14', today: '2026-09-19', areaIds: ['health'],
    milestones: [
      { title: 'First stop', targetDate: '2026-10-28', metric: { label: 'Weight', target: 79, unit: 'kg' } },
      { title: 'Halfway', targetDate: '2026-12-06', metric: { label: 'Weight', target: 74.5, unit: 'kg' } },
      { title: 'Goal weight', targetDate: '2027-01-14', metric: { label: 'Weight', target: 70, unit: 'kg' } },
    ],
    obstacles: ['Cakes'], skills: ['Meal prep'], supporters: ['Terry'],
  })
  it('makes contiguous phases that end at the stops', () => {
    expect(map.phases.map((p) => [p.start, p.end])).toEqual([
      ['2026-09-19', '2026-10-28'], ['2026-10-29', '2026-12-06'], ['2026-12-07', '2027-01-14'],
    ])
    expect(map.phases[0].keyResults[0].metric).toEqual({ label: 'Weight', target: 79, unit: 'kg' })
    expect(map.risks[0].risk).toBe('Cakes')
  })
  it('front-loads concrete tasks into the first phase', () => {
    const first = tasks.filter((t) => t.phaseId === 'p1')
    expect(first.length).toBeGreaterThanOrEqual(4)
    expect(first.map((t) => t.title)).toContain('Start learning: Meal prep')
    expect(first[0].detail).toContain('Terry')
  })
  it('knows the current phase', () => {
    expect(currentPhase(map, '2026-11-15')!.id).toBe('p2')
    expect(currentPhase(map, '2027-03-01')).toBeNull()
  })
})

describe('board columns', () => {
  const t = (id: string, due: string | null, status: Task['status'] = 'todo'): Task =>
    ({ id, phaseId: 'p1', title: id, detail: '', due, status, effort: 'M', source: 'plan', createdAt: 1, doneAt: status === 'done' ? 2 : null })
  it('splits overdue / this week / up next / done', () => {
    const cols = boardColumns([t('a', '2026-09-18'), t('b', '2026-09-21'), t('c', '2026-09-25'), t('d', '2026-10-30'), t('e', null), t('f', '2026-09-20', 'done')], '2026-09-19')
    expect(cols.overdue.map((x) => x.id)).toEqual(['a'])
    expect(cols.thisWeek.map((x) => x.id)).toEqual(['b', 'c'])
    expect(cols.upNext.map((x) => x.id)).toEqual(['d', 'e'])
    expect(cols.done.map((x) => x.id)).toEqual(['f'])
  })
})
