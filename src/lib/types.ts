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

export interface Coach {
  id: string
  name: string
  gender: 'male' | 'female'
  ageBand: '20s' | '30s' | '40s' | '50s'
  style: string
  emoji: string
  gradient: string
  bio: string
}

/** Craig's 7-step goal framework */
export interface GoalPlan {
  statement: string
  benefits: string[]
  supporters: string[]
  obstacles: string[]
  skills: string[]
  actionPlan: string
  targetDate: string
}

export interface FoodEntry {
  id: string
  label: string
  calories: number
  /** negative calories = exercise burn */
  kind: 'food' | 'exercise'
  timestamp: number
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
  heightCm?: number
  weightKg?: number
  goalWeightKg?: number
  calorieTarget?: number
}

export interface AppState {
  profile: UserProfile | null
  checkIns: CheckInRecord[]
  foodLog: FoodEntry[]
  chat: ChatMessage[]
}
