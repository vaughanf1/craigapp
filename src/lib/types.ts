export type GoalAreaId =
  | 'health'
  | 'wealth'
  | 'career'
  | 'family'
  | 'personal'
  | 'spirituality'
  | 'lifestyle'
  | 'community'
  | 'habits'
  | 'legacy'

export interface GoalArea {
  id: GoalAreaId
  name: string
  tagline: string
  icon: string
  gradient: string
  examples: string[]
}

export type VoiceAccent = 'british' | 'american'

export type { Coach, CoachGender, CoachAgeBand } from '../../shared/coaches.ts'
import type { Roadmap } from '../../shared/roadmap.ts'
export type { Roadmap }

/** Craig's 7-step goal framework */
export interface GoalPlan {
  statement: string
  benefits: string[]
  supporters: string[]
  obstacles: string[]
  skills: string[]
  actionPlan: string
  targetDate: string
  /** Halfway milestone — "by the inch it's a cinch" */
  milestone?: string
  /** The reverse-engineered plan the coach built from the goal and date */
  roadmap?: Roadmap
}

export interface FoodEntry {
  id: string
  label: string
  calories: number
  /** negative calories = exercise burn */
  kind: 'food' | 'exercise'
  timestamp: number
}

export interface WeighIn {
  date: string
  kg: number
}

export interface ActionLog {
  date: string
  actionId: string
  done: boolean
}

export interface CheckInRecord {
  date: string // YYYY-MM-DD
  wentWell: boolean
  note: string
}

export interface ChatMessage {
  id: string
  from: 'coach' | 'user'
  text: string
  timestamp: number
}

export interface UserProfile {
  name: string
  dob: string
  areaId: GoalAreaId
  coachId: string
  accent: VoiceAccent
  voiceEnabled: boolean
  checkInsPerDay: 1 | 2 | 3 | 4 | 5
  plan: GoalPlan
  createdAt: number
  /* health-goal extras */
  sex?: 'male' | 'female'
  heightCm?: number
  weightKg?: number
  goalWeightKg?: number
  calorieTarget?: number
  /** Preferred weight units in conversation — stone/lbs (UK), lbs (US) or kg */
  weightUnit?: 'stone' | 'lbs' | 'kg'
  /* AI conversations (bring-your-own-key) */
  aiEnabled?: boolean
  aiApiKey?: string
}

export interface Session {
  phone: string
  userId: string
  timezone: string
  memoryCount: number
}

export interface AppState {
  profile: UserProfile | null
  checkIns: CheckInRecord[]
  foodLog: FoodEntry[]
  chat: ChatMessage[]
  weighIns: WeighIn[]
  actionLog: ActionLog[]
  /** Present when signed in to a Be More server */
  session: Session | null
}
