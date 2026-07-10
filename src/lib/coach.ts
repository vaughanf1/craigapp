import type { GoalAreaId, UserProfile, VoiceAccent } from './types'
import {
  DESTRESS,
  MORNING_KICKOFF,
  MOTIVATION,
  QUESTIONS,
  SUPPORT,
  UNDERSTANDING,
  pick,
} from '../data/content'

/** Day-of-year seed so the daily question rotates but stays stable within a day */
function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000)
}

export function greeting(name: string): string {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name}!`
}

export function dailyQuestion(areaId: GoalAreaId): string {
  return pick(QUESTIONS[areaId], dayOfYear())
}

export function morningKickoff(areaId: GoalAreaId): string {
  return pick(MORNING_KICKOFF[areaId], dayOfYear())
}

export function dailyMotivation(): string {
  return pick(MOTIVATION, dayOfYear())
}

export function supportiveStatement(areaId: GoalAreaId): string {
  return pick(SUPPORT[areaId])
}

export function understandingResponse(): string {
  return pick(UNDERSTANDING)
}

export function destressSuggestion(): string {
  return pick(DESTRESS)
}

export function streakPraise(name: string, streak: number, areaId: GoalAreaId): string {
  if (streak <= 0) return `${name}, today is day one — and day one is the bravest day of all.`
  if (streak === 1) return `${name}, that's day one done. The journey has officially started!`
  return `${name}, that's ${streak} days in a row. You're doing brilliantly — ${supportiveStatement(areaId).toLowerCase()}`
}

/** Reply to a free-text check-in message with simple sentiment routing */
export function coachReply(profile: UserProfile, userText: string): string {
  const t = userText.toLowerCase()
  const bad =
    /\b(bad|hard|tough|awful|terrible|failed|fail|didn'?t|struggl|stress|slip|gave in|cheat|rubbish|worst|no\b)/.test(
      t,
    )
  const stressed = /\b(stress|anxious|anxiety|overwhelm|worried|panic|tense)\b/.test(t)
  const good = /\b(good|great|yes|did it|done|completed|smashed|nailed|brilliant|amazing|proud|win)\b/.test(t)

  if (stressed) {
    return `${understandingResponse()} Here's something that might help: ${destressSuggestion()}`
  }
  if (bad && !good) {
    return `${understandingResponse()} ${dailyMotivation()}`
  }
  if (good) {
    return `${supportiveStatement(profile.areaId)} ${dailyQuestion(profile.areaId)}`
  }
  return `Thanks for checking in, ${profile.name}. ${dailyQuestion(profile.areaId)}`
}

/* ---------------- Voice: British or American, per Craig's spec ---------------- */

let voices: SpeechSynthesisVoice[] = []
if (typeof speechSynthesis !== 'undefined') {
  const loadVoices = () => {
    voices = speechSynthesis.getVoices()
  }
  loadVoices()
  speechSynthesis.onvoiceschanged = loadVoices
}

export function speak(text: string, accent: VoiceAccent, gender: 'male' | 'female') {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const lang = accent === 'british' ? 'en-GB' : 'en-US'
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  const candidates = voices.filter((v) => v.lang.replace('_', '-').startsWith(lang))
  const preferred =
    candidates.find((v) =>
      gender === 'female' ? /female|woman|samantha|kate|serena|susan|hazel/i.test(v.name) : /male|man|daniel|oliver|alex|arthur|fred/i.test(v.name),
    ) ?? candidates[0]
  if (preferred) utterance.voice = preferred
  utterance.rate = 1
  utterance.pitch = 1
  speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
