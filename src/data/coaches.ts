import type { Coach } from '../lib/types'

/** 8 coaches: male/female across 20s, 30s, 40s, 50s — pick yours like Couch to 5K */
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
  },
]

export function getCoach(id: string): Coach {
  return COACHES.find((c) => c.id === id) ?? COACHES[0]
}
