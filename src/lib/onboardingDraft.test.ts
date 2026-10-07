import { beforeEach, describe, expect, it } from 'vitest'
import { clearDraft, DRAFT_KEY, EMPTY_DRAFT, hasDraft, loadDraft, saveDraft } from './onboardingDraft'

// The test runner has no DOM; a Map-backed stand-in covers the three methods the draft uses
const memory = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
}

describe('onboarding draft', () => {
  beforeEach(() => memory.clear())

  it('starts empty', () => {
    expect(loadDraft()).toEqual(EMPTY_DRAFT)
    expect(hasDraft()).toBe(false)
  })

  it('round-trips everything typed so far, including the step', () => {
    saveDraft({
      ...EMPTY_DRAFT,
      step: 3,
      name: 'Craig',
      areaIds: ['health'],
      statement: 'Lose two stone',
      targetDate: '2027-01-01',
      benefits: ['More energy'],
      weightUnit: 'kg',
      weightKg: '84',
    })
    const d = loadDraft()
    expect(d.step).toBe(3)
    expect(d.name).toBe('Craig')
    expect(d.areaIds).toEqual(['health'])
    expect(d.benefits).toEqual(['More energy'])
    expect(d.weightKg).toBe('84')
    expect(d.savedAt).toBeGreaterThan(0)
    expect(hasDraft()).toBe(true)
  })

  it('never resumes past what the answers allow', () => {
    saveDraft({ ...EMPTY_DRAFT, step: 6, name: 'Craig' })
    expect(loadDraft().step).toBe(1)
    saveDraft({ ...EMPTY_DRAFT, step: 6, name: 'Craig', areaIds: ['career'], statement: 'Promotion', targetDate: '2027-01-01' })
    expect(loadDraft().step).toBe(4)
    saveDraft({ ...EMPTY_DRAFT, step: 6, name: 'Craig', areaIds: ['health'], statement: 'Lose weight', targetDate: '2027-01-01' })
    expect(loadDraft().step).toBe(5)
  })

  it('survives a corrupt entry', () => {
    localStorage.setItem(DRAFT_KEY, '{not json')
    expect(loadDraft()).toEqual(EMPTY_DRAFT)
  })

  it('clears once onboarding finishes', () => {
    saveDraft({ ...EMPTY_DRAFT, name: 'Craig' })
    clearDraft()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })
})
