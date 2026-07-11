import { describe, expect, it } from 'vitest'
import { coachReply, dailyMotivation, dailyQuestion, greeting, streakPraise } from './coach'
import { DESTRESS, UNDERSTANDING } from '../data/content'
import type { UserProfile } from './types'

const profile: UserProfile = {
  name: 'Craig',
  dob: '1965-03-12',
  areaId: 'habits',
  coachId: 'margaret',
  accent: 'british',
  voiceEnabled: false,
  checkInsPerDay: 3,
  plan: {
    statement: 'Quit smoking by Christmas',
    benefits: [],
    supporters: [],
    obstacles: [],
    skills: [],
    actionPlan: '',
    targetDate: '2026-12-25',
  },
  createdAt: 0,
}

describe('coachReply sentiment routing', () => {
  it('responds to a stressed message with understanding and a de-stress suggestion', () => {
    const reply = coachReply(profile, 'I am so stressed and anxious today')
    expect(UNDERSTANDING.some((u) => reply.includes(u))).toBe(true)
    expect(DESTRESS.some((d) => reply.includes(d))).toBe(true)
  })

  it('responds to a bad day with understanding, not celebration', () => {
    const reply = coachReply(profile, "I failed, it was a terrible day and I didn't manage anything")
    expect(UNDERSTANDING.some((u) => reply.includes(u))).toBe(true)
    expect(reply).not.toMatch(/brilliantly/i)
  })

  it('responds to a good day with praise and a follow-up question', () => {
    const reply = coachReply(profile, 'Smashed it today, did everything I planned')
    expect(reply).toMatch(/\?/)
  })

  it('falls back to a friendly check-in for neutral messages', () => {
    const reply = coachReply(profile, 'hello')
    expect(reply).toContain('Craig')
    expect(reply).toMatch(/\?/)
  })

  it('recites the plan back when asked "what is my goal?"', () => {
    const reply = coachReply(profile, "what's my goal again?")
    expect(reply).toContain('Quit smoking by Christmas')
    expect(reply).toContain('December')
  })

  it('supports through a craving with urge-surfing', () => {
    const reply = coachReply(profile, "I'm really craving a cigarette right now")
    expect(reply).toMatch(/pass/i)
    expect(reply).toContain('Craig')
  })

  it('recognises when the user hits one of their own predicted obstacles', () => {
    const withObstacles = {
      ...profile,
      plan: { ...profile.plan, obstacles: ['Social events where others smoke'] },
    }
    const reply = coachReply(withObstacles, 'I was at social events where others smoke all night')
    expect(reply).toContain('obstacles you predicted')
  })
})

describe('daily content rotation', () => {
  it('is deterministic within a day', () => {
    expect(dailyQuestion('habits')).toBe(dailyQuestion('habits'))
    expect(dailyMotivation()).toBe(dailyMotivation())
  })

  it('greets by name', () => {
    expect(greeting('Craig')).toMatch(/^Good (morning|afternoon|evening), Craig!$/)
  })
})

describe('streakPraise', () => {
  it('encourages on day zero rather than praising a streak', () => {
    expect(streakPraise('Craig', 0, 'habits')).toContain('day one')
  })

  it('celebrates multi-day streaks with the count', () => {
    expect(streakPraise('Craig', 5, 'habits')).toContain('5 days in a row')
  })
})
