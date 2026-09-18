/**
 * Coach roster shared by the web app and the server. Self-contained on
 * purpose: the server imports it directly under Node's TypeScript stripping,
 * so it must not pull in extension-less imports.
 */
export type CoachGender = 'male' | 'female'
export type CoachAgeBand = '20s' | '30s' | '40s' | '50s'

export interface Coach {
  id: string
  name: string
  gender: CoachGender
  ageBand: CoachAgeBand
  style: string
  emoji: string
  gradient: string
  bio: string
  /** Intro clip (public/coaches/<id>.mp4) — the coach introducing themselves to camera */
  video: string
  /** Twilio/Polly neural voice used on phone calls */
  phoneVoice: string
}

export const COACHES: Coach[] = [
  {
    id: 'maya',
    name: 'Maya',
    gender: 'female',
    ageBand: '20s',
    style: 'High energy',
    emoji: '👩🏽',
    gradient: 'from-[#ff375f] to-[#ff9f0a]',
    bio: 'Bursting with energy and always in your corner. Maya keeps things fast, fun and full-on.',
    video: 'coaches/maya.mp4',
    phoneVoice: 'Polly.Amy-Neural',
  },
  {
    id: 'jake',
    name: 'Jake',
    gender: 'male',
    ageBand: '20s',
    style: 'Hype man',
    emoji: '👨🏻',
    gradient: 'from-[#0a84ff] to-[#5e5ce6]',
    bio: 'Your biggest fan. Jake celebrates every win — and picks you straight back up after a wobble.',
    video: 'coaches/jake.mp4',
    phoneVoice: 'Polly.Arthur-Neural',
  },
  {
    id: 'sophia',
    name: 'Sophia',
    gender: 'female',
    ageBand: '30s',
    style: 'Calm & focused',
    emoji: '👩🏼',
    gradient: 'from-[#30b0c7] to-[#0a84ff]',
    bio: 'Measured, mindful and quietly relentless. Sophia helps you find focus when life gets loud.',
    video: 'coaches/sophia.mp4',
    phoneVoice: 'Polly.Emma-Neural',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    gender: 'male',
    ageBand: '30s',
    style: 'Straight talker',
    emoji: '👨🏿',
    gradient: 'from-[#32d74b] to-[#00c7be]',
    bio: 'No fluff, no excuses — just honest encouragement and a clear plan. Marcus tells it like it is.',
    video: 'coaches/marcus.mp4',
    phoneVoice: 'Polly.Brian-Neural',
  },
  {
    id: 'elena',
    name: 'Elena',
    gender: 'female',
    ageBand: '40s',
    style: 'Warm mentor',
    emoji: '👩🏻',
    gradient: 'from-[#bf5af2] to-[#ff375f]',
    bio: 'Been there, done it, and remembers how hard it was. Elena coaches with warmth and wisdom.',
    video: 'coaches/elena.mp4',
    phoneVoice: 'Polly.Amy-Neural',
  },
  {
    id: 'david',
    name: 'David',
    gender: 'male',
    ageBand: '40s',
    style: 'Steady coach',
    emoji: '👨🏽',
    gradient: 'from-[#5e5ce6] to-[#bf5af2]',
    bio: 'Consistent beats intense. David is all about small daily wins that stack into big results.',
    video: 'coaches/david.mp4',
    phoneVoice: 'Polly.Brian-Neural',
  },
  {
    id: 'margaret',
    name: 'Margaret',
    gender: 'female',
    ageBand: '50s',
    style: 'Wise & kind',
    emoji: '👵🏼',
    gradient: 'from-[#ff9f0a] to-[#bf5af2]',
    bio: 'A lifetime of perspective and a heart of gold. Margaret believes in you before you do.',
    video: 'coaches/margaret.mp4',
    phoneVoice: 'Polly.Emma-Neural',
  },
  {
    id: 'richard',
    name: 'Richard',
    gender: 'male',
    ageBand: '50s',
    style: 'Old school',
    emoji: '👴🏻',
    gradient: 'from-[#6e6e73] to-[#1d1d1f]',
    bio: 'Discipline, standards, and a firm handshake. Richard brings the old-school work ethic.',
    video: 'coaches/richard.mp4',
    phoneVoice: 'Polly.Arthur-Neural',
  },
]

export function getCoach(id: string | undefined): Coach {
  return COACHES.find((c) => c.id === id) ?? COACHES[0]
}
