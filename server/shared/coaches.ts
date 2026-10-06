/**
 * Coach roster shared by the web app and the server. Self-contained on
 * purpose: the server imports it directly under Node's TypeScript stripping,
 * so it must not pull in extension-less imports.
 *
 * Twelve coaches, twelve methodologies (see voices/types.ts), one voice guide
 * each (voices/<id>.json). Every coach is fictional: no coach is named after,
 * modelled on or "in the style of" any real person. Demographics are
 * deliberately paired against stereotype — see docs/coach-roster.md for the
 * grid.
 */
import type { MethodologyId } from './voices/types.ts'

export type CoachGender = 'male' | 'female'
export type CoachAgeBand = '20s' | '30s' | '40s' | '50s' | '60s'

export interface Coach {
  id: string
  name: string
  gender: CoachGender
  ageBand: CoachAgeBand
  /** Short label shown in the picker, e.g. 'Zero excuses' */
  style: string
  /** Which of the twelve coaching methodologies this coach uses (see voices/types.ts) */
  methodology: MethodologyId
  /** Visible heritage of the character, for the roster grid and so avatar and voice stay consistent */
  heritage: string
  /** Where their accent is from, e.g. 'Glasgow, Scotland' — drives the voice assignment and the identity line in the prompt */
  accent: string
  emoji: string
  gradient: string
  bio: string
  /** Intro clip (public/coaches/<id>.mp4) — the coach introducing themselves to camera */
  video: string
  /**
   * The ONE voice for this coach. The in-app call, the phone call and the intro
   * clip all derive from it, so they can never drift apart. Null until the voice
   * has been created with the provider (see server/scripts/voices-create.ts).
   */
  voiceId: string | null
  /** Text description the voice was designed from — age, gender, accent, manner. Synthetic voice, no real person. */
  voiceDesign: string
  /** Twilio/Polly neural voice used on phone calls until the phone pipeline moves onto voiceId */
  phoneVoice: string
}

export const COACHES: Coach[] = [
  {
    id: 'maya',
    name: 'Maya',
    gender: 'female',
    ageBand: '20s',
    style: 'High energy',
    methodology: 'hype',
    heritage: 'Black British',
    accent: 'London, England',
    emoji: '👩🏾',
    gradient: 'from-[#ff375f] to-[#ff9f0a]',
    bio: 'Bursting with energy and always in your corner. Maya keeps things fast, fun and full-on.',
    video: 'coaches/maya.mp4',
    voiceId: '5A156qEKI93TAa9QHl69',
    voiceDesign: 'A Black British woman in her mid-twenties from London. Bright, quick and high-energy; a natural South London accent; speaks fast with lots of lift and warmth, like a hype friend leaving a voice note.',
    phoneVoice: 'Polly.Amy-Neural',
  },
  {
    id: 'jake',
    name: 'Jake',
    gender: 'male',
    ageBand: '20s',
    style: 'Encourager',
    methodology: 'encourager',
    heritage: 'White British',
    accent: 'Cardiff, Wales',
    emoji: '👨🏻',
    gradient: 'from-[#0a84ff] to-[#5e5ce6]',
    bio: 'Your biggest fan. Jake notices every small win, says it out loud, and builds your confidence brick by brick.',
    video: 'coaches/jake.mp4',
    // STAND-IN: ElevenLabs premade 'George' (British, middle-aged) — the Starter plan's 10 voice slots were full; design Jake's own Cardiff voice when slots allow
    voiceId: 'JBFqnCBsd6RMkjVDRZzb',
    voiceDesign: 'A white Welsh man in his mid-twenties from Cardiff. Warm, friendly and encouraging; a soft Cardiff accent; relaxed medium pace, smiling tone, conversational.',
    phoneVoice: 'Polly.Arthur-Neural',
  },
  {
    id: 'sophia',
    name: 'Sophia',
    gender: 'female',
    ageBand: '30s',
    style: 'Stoic',
    methodology: 'stoic',
    heritage: 'White British',
    accent: 'Edinburgh, Scotland',
    emoji: '👩🏼',
    gradient: 'from-[#30b0c7] to-[#0a84ff]',
    bio: 'Measured, mindful and quietly relentless. Sophia coaches what you can control and lets the rest go.',
    video: 'coaches/sophia.mp4',
    voiceId: 'RwQ3AMZO4iQVMU7POaP4',
    voiceDesign: 'A white Scottish woman in her mid-thirties from Edinburgh. Calm, measured and even; a gentle Edinburgh accent; unhurried pace, low-to-mid pitch, composed, never excited.',
    phoneVoice: 'Polly.Emma-Neural',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    gender: 'male',
    ageBand: '30s',
    style: 'Numbers, no fluff',
    methodology: 'operator',
    heritage: 'Black British',
    accent: 'South London, England',
    emoji: '👨🏿',
    gradient: 'from-[#32d74b] to-[#00c7be]',
    bio: 'Inputs, outputs and the return on your effort. Marcus runs your goal like a business and every excuse gets costed.',
    video: 'coaches/marcus.mp4',
    voiceId: 'H4Zx2OFFZV7K0WCe28eM',
    voiceDesign: 'A Black British man in his mid-thirties from South London. Direct, confident and no-nonsense; a clear South London accent; brisk pace, firm clipped delivery, businesslike.',
    phoneVoice: 'Polly.Brian-Neural',
  },
  {
    id: 'fiona',
    name: 'Fiona',
    gender: 'female',
    ageBand: '30s',
    style: 'Zero excuses',
    methodology: 'discipline',
    heritage: 'White Scottish',
    accent: 'Glasgow, Scotland',
    emoji: '👩🏻',
    gradient: 'from-[#1d1d1f] to-[#ff453a]',
    bio: 'Two boxes: done or not done. Fiona runs your plan like a brief and expects it executed, on time, every day.',
    video: 'coaches/fiona.mp4',
    voiceId: 'F9nfbmIzXjJMjWnRoVE4',
    voiceDesign: 'A white Scottish woman in her early thirties from Glasgow. Crisp, authoritative and level; a distinct Glaswegian accent; short clipped sentences, brisk, commanding without ever shouting.',
    phoneVoice: 'Polly.Amy-Neural',
  },
  {
    id: 'david',
    name: 'David',
    gender: 'male',
    ageBand: '40s',
    style: 'Systems & habits',
    methodology: 'systems',
    heritage: 'White British',
    accent: 'Leeds, Yorkshire',
    emoji: '👨🏻',
    gradient: 'from-[#5e5ce6] to-[#bf5af2]',
    bio: 'Consistent beats intense. David changes the room, not the person — small setups that make the right thing automatic.',
    video: 'coaches/david.mp4',
    // STAND-IN: ElevenLabs premade 'Daniel' (British, middle-aged) — design David's own Leeds voice when slots allow
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    voiceDesign: 'A white English man in his mid-forties from Leeds. Steady, practical and reassuring; a warm Yorkshire accent; relaxed pace, plain and down-to-earth.',
    phoneVoice: 'Polly.Brian-Neural',
  },
  {
    id: 'karim',
    name: 'Karim',
    gender: 'male',
    ageBand: '40s',
    style: 'Mindful',
    methodology: 'mindfulness',
    heritage: 'British Lebanese',
    accent: 'Birmingham, England (Lebanese-born)',
    emoji: '👨🏽',
    gradient: 'from-[#64d2ff] to-[#30d158]',
    bio: 'Breathe first, then decide. Karim slows the moment down so the urge passes and the choice is yours.',
    video: 'coaches/karim.mp4',
    voiceId: 'Z85d8izOCgLzIHeHO61T',
    voiceDesign: 'A British Lebanese man in his mid-forties from Birmingham. Soft, slow and grounded; a gentle Birmingham accent with a light Levantine influence; unhurried with natural pauses, low, calm and kind.',
    phoneVoice: 'Polly.Arthur-Neural',
  },
  {
    id: 'priya',
    name: 'Priya',
    gender: 'female',
    ageBand: '40s',
    style: 'Accountability partner',
    methodology: 'partner',
    heritage: 'British Indian',
    accent: 'Leicester, England',
    emoji: '👩🏽',
    gradient: 'from-[#ff9f0a] to-[#ff375f]',
    bio: 'Not above you, beside you. Priya puts her word on the table next to yours and checks that both get kept.',
    video: 'coaches/priya.mp4',
    voiceId: 'nAZ54GPVA8TsI7Iq7t7S',
    voiceDesign: 'A British Indian woman in her early forties from Leicester. Chatty, warm, informal and quick; an East Midlands accent; sounds like a close friend, playful and direct.',
    phoneVoice: 'Polly.Amy-Neural',
  },
  {
    id: 'margaret',
    name: 'Margaret',
    gender: 'female',
    ageBand: '50s',
    style: 'Asks the questions',
    methodology: 'socratic',
    heritage: 'White British',
    accent: 'Surrey, England',
    emoji: '👵🏼',
    gradient: 'from-[#ff9f0a] to-[#bf5af2]',
    bio: 'A lifetime of perspective and very few instructions. Margaret asks the question you have been avoiding and waits.',
    video: 'coaches/margaret.mp4',
    // STAND-IN: ElevenLabs premade 'Alice' (British RP, middle-aged) — closest premade to Margaret's design; replace when slots allow
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
    voiceDesign: 'A white English woman in her late fifties from Surrey. Dry, curious and gently amused; Received Pronunciation; measured pace, thoughtful pauses, a questioning lift at the end of sentences.',
    phoneVoice: 'Polly.Emma-Neural',
  },
  {
    id: 'arun',
    name: 'Arun',
    gender: 'male',
    ageBand: '50s',
    style: 'Strategist',
    methodology: 'strategist',
    heritage: 'British Indian',
    accent: 'Bradford, Yorkshire',
    emoji: '👨🏾',
    gradient: 'from-[#0a84ff] to-[#30b0c7]',
    bio: 'Starts at the finish line and walks back. Arun turns your goal into dated stops and this week\'s job.',
    video: 'coaches/arun.mp4',
    voiceId: '03HjyursVn3V1u5ZwmgQ',
    voiceDesign: 'A British Indian man in his mid-fifties from Bradford. Calm, structured and organised; a Yorkshire accent with a light Indian English influence; even pace, clear and methodical.',
    phoneVoice: 'Polly.Brian-Neural',
  },
  {
    id: 'ken',
    name: 'Ken',
    gender: 'male',
    ageBand: '60s',
    style: 'Performance coach',
    methodology: 'athletic',
    heritage: 'British Chinese',
    accent: 'Liverpool, England (Hong Kong-born)',
    emoji: '👴🏻',
    gradient: 'from-[#30d158] to-[#0a84ff]',
    bio: 'Build the base, recover on purpose, load a little more. Ken coaches you like an athlete in a long season.',
    video: 'coaches/ken.mp4',
    voiceId: 'nskPgv5qHOBG06yFAMEm',
    voiceDesign: 'A British Chinese man in his mid-sixties from Liverpool, born in Hong Kong. Patient, kind and technical; a Scouse accent with a light Cantonese influence; unhurried, steady, slightly gravelly.',
    phoneVoice: 'Polly.Brian-Neural',
  },
  {
    id: 'grace',
    name: 'Grace',
    gender: 'female',
    ageBand: '60s',
    style: 'Plain-spoken',
    methodology: 'mentor',
    heritage: 'Black British (Nigerian-born)',
    accent: 'London, England (Nigerian-born)',
    emoji: '👵🏿',
    gradient: 'from-[#bf5af2] to-[#ff9f0a]',
    bio: 'Plain truth, plain food, early night. Grace has no time for pity and all the time in the world for you.',
    video: 'coaches/grace.mp4',
    voiceId: 'F6SVkGXtItsEheXrNNFv',
    voiceDesign: 'A Black British woman in her mid-sixties from London, born in Nigeria. Plain-spoken, warm and no-nonsense; a London accent with Nigerian roots; unhurried and firm, with a dry twinkle.',
    phoneVoice: 'Polly.Emma-Neural',
  },
]

/** Coaches retired in the roster expansion, mapped to the closest current coach so existing profiles keep working */
export const RETIRED_COACHES: Record<string, string> = {
  elena: 'priya',     // warm mentor who'd "been there" → the accountability partner
  richard: 'fiona',   // old-school discipline → zero excuses
}

export function getCoach(id: string | undefined): Coach {
  const resolved = id && RETIRED_COACHES[id] ? RETIRED_COACHES[id] : id
  return COACHES.find((c) => c.id === resolved) ?? COACHES[0]
}
