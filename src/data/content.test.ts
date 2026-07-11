import { describe, expect, it } from 'vitest'
import { DESTRESS, MORNING_KICKOFF, MOTIVATION, QUESTIONS, SUPPORT, UNDERSTANDING } from './content'
import { GOAL_AREAS } from './goalAreas'
import { COACHES } from './coaches'

/** Craig's content spec, enforced */
describe('content banks match the spec', () => {
  it('has 20 check-in questions for every goal area', () => {
    for (const area of GOAL_AREAS) {
      expect(QUESTIONS[area.id], `questions for ${area.id}`).toHaveLength(20)
    }
  })

  it('has 20 supportive statements for every goal area', () => {
    for (const area of GOAL_AREAS) {
      expect(SUPPORT[area.id], `support for ${area.id}`).toHaveLength(20)
    }
  })

  it('has 40 motivational sayings', () => {
    expect(MOTIVATION).toHaveLength(40)
  })

  it('has 20 "I understand" responses', () => {
    expect(UNDERSTANDING).toHaveLength(20)
  })

  it('has de-stress suggestions', () => {
    expect(DESTRESS.length).toBeGreaterThanOrEqual(10)
  })

  it('has morning kick-off lines for every goal area', () => {
    for (const area of GOAL_AREAS) {
      expect(MORNING_KICKOFF[area.id].length, `kickoff for ${area.id}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('has no duplicate questions within an area', () => {
    for (const area of GOAL_AREAS) {
      expect(new Set(QUESTIONS[area.id]).size).toBe(QUESTIONS[area.id].length)
    }
  })
})

describe('coaches match the spec', () => {
  it('offers 8 coaches: male and female across 20s-50s', () => {
    expect(COACHES).toHaveLength(8)
    for (const band of ['20s', '30s', '40s', '50s'] as const) {
      const inBand = COACHES.filter((c) => c.ageBand === band)
      expect(inBand.map((c) => c.gender).sort()).toEqual(['female', 'male'])
    }
  })

  it('avoids fragile composite emoji (broken on older platforms)', () => {
    for (const c of COACHES) {
      expect(c.emoji, `${c.name}'s avatar`).not.toContain('‍') // no ZWJ sequences
    }
    for (const a of GOAL_AREAS) {
      expect(a.icon, `${a.name}'s icon`).not.toContain('‍')
    }
  })
})
