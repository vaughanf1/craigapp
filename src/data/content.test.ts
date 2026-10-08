import { describe, expect, it } from 'vitest'
import { DESTRESS, MORNING_KICKOFF, MOTIVATION, QUESTIONS, SUPPORT, UNDERSTANDING } from './content'
import { GOAL_AREAS } from './goalAreas'
import { COACHES, getCoach } from './coaches'

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
  it('offers 12 coaches, six women and six men, from their 20s to their 60s', () => {
    expect(COACHES).toHaveLength(12)
    expect(COACHES.filter((c) => c.gender === 'female')).toHaveLength(6)
    expect(COACHES.filter((c) => c.gender === 'male')).toHaveLength(6)
    for (const band of ['20s', '30s', '40s', '50s', '60s'] as const) {
      expect(COACHES.some((c) => c.ageBand === band), `a coach in their ${band}`).toBe(true)
    }
  })
  it('is visibly diverse: Black, East Asian, South Asian, Middle Eastern and white coaches', () => {
    const h = COACHES.map((c) => c.heritage.toLowerCase())
    expect(h.some((x) => x.includes('black'))).toBe(true)
    expect(h.some((x) => x.includes('chinese'))).toBe(true)
    expect(h.some((x) => x.includes('indian'))).toBe(true)
    expect(h.some((x) => x.includes('lebanese'))).toBe(true)
    expect(h.some((x) => x.includes('white'))).toBe(true)
  })
  it('gives every coach a different methodology', () => {
    expect(new Set(COACHES.map((c) => c.methodology)).size).toBe(12)
  })
  it('keeps retired coaches resolving to a current one', () => {
    expect(getCoach('elena').id).toBe('priya')
    expect(getCoach('richard').id).toBe('ken')
    expect(getCoach('nobody').id).toBe(COACHES[0].id)
  })
  it('avoids fragile composite emoji (broken on older platforms)', () => {
    for (const c of COACHES) {
      expect(c.emoji, `${c.name}'s avatar`).not.toContain('\u200d') // no ZWJ sequences
    }
    for (const a of GOAL_AREAS) {
      expect(a.icon, `${a.name}'s icon`).not.toContain('\u200d')
    }
  })
})
