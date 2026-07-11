import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, toApiMessages } from './ai'
import { getCoach } from '../data/coaches'
import type { ChatMessage, UserProfile } from './types'

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
    benefits: ['My breath won’t smell', 'I’ll live a lot longer'],
    supporters: ['My wife'],
    obstacles: ['Social events where others smoke'],
    skills: [],
    actionPlan: 'Patches week 1-4, gum after',
    targetDate: '2026-12-25',
  },
  createdAt: 0,
}

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt(profile, getCoach('margaret'), [
    { date: '2026-07-10', wentWell: true, note: 'no cigarettes at the pub!' },
  ])

  it('embeds the coach persona', () => {
    expect(prompt).toContain('Margaret')
    expect(prompt).toContain('Wise & kind')
  })

  it('embeds the goal, benefits and obstacles (the memory)', () => {
    expect(prompt).toContain('Quit smoking by Christmas')
    expect(prompt).toContain('My breath won’t smell')
    expect(prompt).toContain('Social events where others smoke')
    expect(prompt).toContain('no cigarettes at the pub!')
  })

  it('includes safety boundaries', () => {
    expect(prompt).toContain('not a medical')
    expect(prompt).toMatch(/Samaritans|988/)
  })
})

describe('toApiMessages', () => {
  it('drops leading coach messages so history starts with a user turn', () => {
    const chat: ChatMessage[] = [
      { id: '1', from: 'coach', text: 'Morning!', timestamp: 1 },
      { id: '2', from: 'user', text: 'Hi Margaret', timestamp: 2 },
      { id: '3', from: 'coach', text: 'How did it go?', timestamp: 3 },
    ]
    const messages = toApiMessages(chat)
    expect(messages[0]).toEqual({ role: 'user', content: 'Hi Margaret' })
    expect(messages).toHaveLength(2)
  })

  it('returns empty when there are no user messages yet', () => {
    expect(toApiMessages([{ id: '1', from: 'coach', text: 'Hello', timestamp: 1 }])).toEqual([])
  })
})
