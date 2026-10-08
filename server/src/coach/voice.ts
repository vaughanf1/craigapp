import { z } from 'zod'
import { getCoach } from '../../shared/coaches.ts'
import { getVoiceGuide, METHODOLOGIES, VOICE_GUIDE_LIMITS, type VoiceGuide } from '../../shared/voices/index.ts'

/**
 * A coach's voice: the part of the system prompt that makes them *them*.
 * The data lives in server/shared/voices/<id>.json; this file checks it and
 * turns it into prompt text. Shared behaviour is in rules.ts.
 */

const line = z.string().trim().min(1)
const moment = z.object({ approach: line, example: line })
const L = VOICE_GUIDE_LIMITS

export const voiceGuideSchema = z.object({
  coachId: line,
  methodology: z.enum(Object.keys(METHODOLOGIES) as [keyof typeof METHODOLOGIES, ...(keyof typeof METHODOLOGIES)[]]),
  method: line,
  rhythm: z.object({ pattern: z.enum(['short-clipped', 'long-discursive', 'questioning', 'measured']), notes: line }),
  vocabulary: z.array(line).min(L.vocabulary.min).max(L.vocabulary.max),
  banned: z.array(line).min(L.banned.min),
  catchphrases: z.array(line).min(L.catchphrases.min).max(L.catchphrases.max),
  moments: z.object({
    morningOpen: moment,
    eveningOpen: moment,
    goalHit: moment,
    missedOnce: moment,
    missedRepeatedly: moment,
    struggling: moment,
  }),
  examples: z.array(line).min(L.examples.min).max(L.examples.max),
})

/** Throws with a readable message if a guide doesn't match the spec */
export function validateVoiceGuide(guide: unknown): VoiceGuide {
  return voiceGuideSchema.parse(guide) as VoiceGuide
}

const quote = (s: string) => `"${s.replace(/"/g, '”')}"`

/** The voice section of the system prompt. Empty string while a coach has no guide yet. */
export function voiceBlock(coachId: string): string {
  const g = getVoiceGuide(coachId)
  if (!g) return ''
  const coach = getCoach(coachId)
  const m = g.moments
  return `YOUR VOICE (this is what makes you ${coach.name} and nobody else. The guide sets your words; the Be More Way below sets your heart. If they ever disagree, the Be More Way wins — stay in your voice, but always on their side)
Your method: ${METHODOLOGIES[g.methodology]}. ${g.method}
Your rhythm (${g.rhythm.pattern}): ${g.rhythm.notes}
Words and phrases you reach for: ${g.vocabulary.join('; ')}.
Things you never say, in any form: ${g.banned.join('; ')}.
Your own phrases (at most one per conversation, never two turns running, never as a greeting): ${g.catchphrases.map(quote).join(' ')}

The moments that matter, and how you handle them:
- Opening a morning check-in: ${m.morningOpen.approach} For example: ${quote(m.morningOpen.example)}
- Opening an evening check-in: ${m.eveningOpen.approach} For example: ${quote(m.eveningOpen.example)}
- They hit the goal: ${m.goalHit.approach} For example: ${quote(m.goalHit.example)}
- They missed once: ${m.missedOnce.approach} For example: ${quote(m.missedOnce.example)}
- They keep missing: ${m.missedRepeatedly.approach} For example: ${quote(m.missedRepeatedly.example)}
- They're upset or struggling: ${m.struggling.approach} For example: ${quote(m.struggling.example)}

Lines that sound like you (match this register exactly; never repeat them word for word, and swap in the person's real numbers and words):
${g.examples.map((e) => `- ${quote(e)}`).join('\n')}`
}
