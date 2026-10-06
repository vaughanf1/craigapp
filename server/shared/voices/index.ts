import type { VoiceGuide } from './types.ts'
import maya from './maya.json' with { type: 'json' }
import jake from './jake.json' with { type: 'json' }
import sophia from './sophia.json' with { type: 'json' }
import marcus from './marcus.json' with { type: 'json' }
import fiona from './fiona.json' with { type: 'json' }
import david from './david.json' with { type: 'json' }
import karim from './karim.json' with { type: 'json' }
import priya from './priya.json' with { type: 'json' }
import margaret from './margaret.json' with { type: 'json' }
import arun from './arun.json' with { type: 'json' }
import ken from './ken.json' with { type: 'json' }
import grace from './grace.json' with { type: 'json' }

export type { VoiceGuide, Moment, MethodologyId, RhythmPattern } from './types.ts'
export { METHODOLOGIES, VOICE_GUIDE_LIMITS } from './types.ts'

/**
 * Every voice guide, by coach id. Adding a coach: drop <id>.json in this
 * folder and import it here — the schema check in server/src/coach/voice.ts
 * (and the voices test) will tell you if anything is missing.
 */
export const VOICE_GUIDES: Record<string, VoiceGuide> = Object.fromEntries(
  [maya, jake, sophia, marcus, fiona, david, karim, priya, margaret, arun, ken, grace].map((g) => [g.coachId, g as VoiceGuide]),
)

/** The coach's voice guide, or null while a coach is still waiting for one */
export function getVoiceGuide(coachId: string): VoiceGuide | null {
  return VOICE_GUIDES[coachId] ?? null
}
