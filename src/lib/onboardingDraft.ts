import type { OnboardingSuggestions } from './api'
import type { GoalAreaId, VoiceAccent } from './types'

/**
 * Everything typed into onboarding, saved as you go.
 *
 * Onboarding used to live only in component state, so a browser back, a swipe-back on
 * iOS, a reload, or the service worker refreshing a stale shell wiped every answer.
 * The draft is written to localStorage on every change and cleared once the profile
 * is created, so you always pick up exactly where you left off.
 */
export interface OnboardingDraft {
  step: number
  name: string
  dob: string
  areaIds: GoalAreaId[]
  statement: string
  targetDate: string
  benefits: string[]
  obstacles: string[]
  supporters: string[]
  skills: string[]
  actionPlan: string
  coachId: string | null
  accent: VoiceAccent
  checkInsPerDay: 1 | 2 | 3 | 4 | 5
  sex?: 'male' | 'female'
  heightCm: string
  weightKg: string
  goalWeightKg: string
  weightUnit: 'stone' | 'lbs' | 'kg'
  /** The coach's reading of the goal, plus the inputs it was generated from */
  suggest: OnboardingSuggestions | null
  suggestedFor: string
  savedAt: number
}

export const DRAFT_KEY = 'bemore-onboarding-draft-v1'

export const EMPTY_DRAFT: OnboardingDraft = {
  step: 0,
  name: '',
  dob: '',
  areaIds: [],
  statement: '',
  targetDate: '',
  benefits: [],
  obstacles: [],
  supporters: [],
  skills: [],
  actionPlan: '',
  coachId: null,
  accent: 'british',
  checkInsPerDay: 3,
  sex: undefined,
  heightCm: '',
  weightKg: '',
  goalWeightKg: '',
  weightUnit: 'stone',
  suggest: null,
  suggestedFor: '',
  savedAt: 0,
}

export function loadDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return EMPTY_DRAFT
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>
    const draft = { ...EMPTY_DRAFT, ...parsed }
    // Never resume onto a step the saved answers can't reach (e.g. a stale or hand-edited draft)
    draft.step = Math.max(0, Math.min(draft.step, lastReachableStep(draft)))
    return draft
  } catch {
    return EMPTY_DRAFT
  }
}

export function saveDraft(draft: OnboardingDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Storage unavailable (private browsing, sandboxed iframe) — the draft stays in memory
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

/** True when the person has actually typed something worth resuming */
export function hasDraft(draft: OnboardingDraft = loadDraft()): boolean {
  return draft.name.trim().length > 0 || draft.areaIds.length > 0 || draft.statement.trim().length > 0
}

/**
 * The furthest step the draft's answers justify. Mirrors the "Continue" gating in
 * Onboarding: name → areas → goal + date → (plan) → coach. Anything past the coach step
 * has no required fields, so a draft with a coach may resume anywhere.
 */
function lastReachableStep(d: OnboardingDraft): number {
  if (!d.name.trim()) return 0
  if (d.areaIds.length === 0) return 1
  if (!d.statement.trim() || !d.targetDate) return 2
  // The coach step is index 5 with the extra health step, 4 without
  if (!d.coachId) return d.areaIds.includes('health') ? 5 : 4
  return 7 // both step lists have eight entries

}
