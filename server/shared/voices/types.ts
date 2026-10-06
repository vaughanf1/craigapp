/**
 * Per-coach voice guides. Each coach's guide lives in its own JSON file next
 * to this one (server/shared/voices/<coachId>.json) so the words can be
 * edited without touching code. The shared behavioural rules (not-a-yes-man,
 * execution ladder, discovery, safety, memory) live in
 * server/src/coach/rules.ts and are never duplicated here.
 *
 * Self-contained on purpose: the server imports this under Node's TypeScript
 * stripping, so it must not pull in extension-less imports or npm packages.
 */

/** The twelve coaching methodologies — a genuinely different approach, not a different tone */
export const METHODOLOGIES = {
  discipline: 'Military-style discipline, zero excuses',
  operator: 'Blunt commercial operator — leverage, volume, numbers, outcomes over feelings',
  encourager: 'Warm encourager — builds confidence, celebrates small wins',
  socratic: 'Socratic questioner — rarely instructs, almost always asks',
  systems: 'Systems and habits — environment design and tiny changes',
  stoic: 'Stoic — calm, philosophical, detached from outcome',
  hype: 'High-energy hype — relentless enthusiasm',
  mentor: 'Old-school plain-spoken mentor — practical, unsentimental',
  athletic: 'Athletic performance — periodisation, recovery, progressive overload',
  mindfulness: 'Mindfulness-grounded — breath, attention, presence',
  partner: 'Accountability partner — a peer who matches your effort',
  strategist: 'Strategic planner — sequenced milestones, works backwards from the goal',
} as const

export type MethodologyId = keyof typeof METHODOLOGIES

/** How sentences tend to run. `notes` refines it (typical length, punctuation, shape of a turn). */
export type RhythmPattern = 'short-clipped' | 'long-discursive' | 'questioning' | 'measured'

/** One of the moments every coach has to handle — how they approach it, and one line showing it */
export interface Moment {
  approach: string
  example: string
}

export interface VoiceGuide {
  coachId: string
  methodology: MethodologyId
  /** The method in one or two sentences, in this coach's own terms */
  method: string
  rhythm: { pattern: RhythmPattern; notes: string }
  /** 15-20 words and phrases they reach for */
  vocabulary: string[]
  /** 10+ things this coach would never say */
  banned: string[]
  /** 3-5 original catchphrases — never borrowed from any real coach, author or public figure */
  catchphrases: string[]
  moments: {
    morningOpen: Moment
    eveningOpen: Moment
    goalHit: Moment
    missedOnce: Moment
    missedRepeatedly: Moment
    struggling: Moment
  }
  /** 8-10 example lines showing the voice in action */
  examples: string[]
}

/** Bounds the voice guide spec sets; enforced by the schema in server/src/coach/voice.ts and the tests */
export const VOICE_GUIDE_LIMITS = {
  vocabulary: { min: 15, max: 20 },
  banned: { min: 10 },
  catchphrases: { min: 3, max: 5 },
  examples: { min: 8, max: 10 },
} as const
