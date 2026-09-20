/** Server-side view of the data the app syncs. Mirrors src/lib/types.ts in the web app. */
export type GoalAreaId =
  | 'health' | 'wealth' | 'career' | 'family' | 'personal'
  | 'spirituality' | 'lifestyle' | 'community' | 'habits' | 'legacy'

export const AREA_NAMES: Record<GoalAreaId, string> = {
  health: 'Health & Fitness',
  wealth: 'Wealth & Finance',
  career: 'Career & Work',
  family: 'Family & Relationships',
  personal: 'Personal Development',
  spirituality: 'Spirituality & Mindfulness',
  lifestyle: 'Lifestyle & Leisure',
  community: 'Community & Contribution',
  habits: 'Break Bad Habits',
  legacy: 'Legacy & Life Purpose',
}

/** Tone the coach takes — hard-edged for measurable goals, gentle for inner work */
export const AREA_TONE: Record<GoalAreaId, string> = {
  health: 'Direct and numbers-aware. Weight, calories and movement are measurable — say the numbers, kindly.',
  wealth: 'Practical and specific about money. Ask what they did, not how they feel about it.',
  career: 'Energetic and ambitious. Do more than you are paid for and you will be paid for more than you do.',
  family: 'Warm and relational. Small gestures, kept promises, time given.',
  personal: 'Curious and encouraging. Growth is daily, not dramatic.',
  spirituality: 'Softly, softly. No targets, no pushing. Ask how they feel and what nourished them today.',
  lifestyle: 'Light and joyful. Permission to enjoy, structure to make it happen.',
  community: 'Generous and outward-looking. Who did you help today?',
  habits: 'Firm but forgiving. An urge passes in minutes; a slip is not a relapse.',
  legacy: 'Reflective and long-horizon. Connect today to the life they want to have lived.',
}

import type { Roadmap } from '../../shared/roadmap.ts'
export type { Roadmap }

export interface WeighIn {
  date: string
  kg: number
}
export interface ActionLog {
  date: string
  actionId: string
  done: boolean
}

export interface GoalPlan {
  statement: string
  benefits: string[]
  supporters: string[]
  obstacles: string[]
  skills: string[]
  actionPlan: string
  targetDate: string
  /** Halfway milestone the coach proposed ("by the inch it's a cinch") */
  milestone?: string
  roadmap?: Roadmap
}

export interface UserProfile {
  name: string
  dob: string
  areaId: GoalAreaId
  areaIds?: GoalAreaId[]
  coachId: string
  accent: 'british' | 'american'
  voiceEnabled: boolean
  checkInsPerDay: number
  plan: GoalPlan
  createdAt: number
  sex?: 'male' | 'female'
  heightCm?: number
  weightKg?: number
  goalWeightKg?: number
  calorieTarget?: number
  /** Preferred weight units for conversation: stone/lbs (UK), lbs (US) or kg */
  weightUnit?: 'stone' | 'lbs' | 'kg'
}

export interface CheckIn {
  date: string
  wentWell: boolean
  note: string
}

export interface FoodEntry {
  id: string
  label: string
  calories: number
  kind: 'food' | 'exercise'
  timestamp: number
}

export interface Memory {
  id: string
  kind: 'fact' | 'preference' | 'pattern' | 'event' | 'win' | 'struggle'
  text: string
  importance: number
  source: string
  createdAt: number
  updatedAt: number
}

export interface DaySummary {
  date: string
  summary: string
  mood: string
  wins: string
  struggles: string
  tomorrowFocus: string
  caloriesIn: number | null
  caloriesTarget: number | null
}

export interface Schedule {
  times: string[]
  channels: ('push' | 'call')[]
  enabled: boolean
}

export type DeliveryKind = 'morning' | 'evening' | 'manual'
export interface Delivery {
  id: string
  date: string
  slot: string
  kind: DeliveryKind
  brief: string
  channels: string[]
  status: string
  createdAt: number
  answeredAt: number | null
}
