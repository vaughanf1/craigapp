import type { UserProfile } from './types'

export function ageFromDob(dob: string): number | null {
  if (!dob) return null
  const born = new Date(dob)
  if (isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  if (beforeBirthday) age--
  return age >= 0 && age < 130 ? age : null
}

/**
 * Suggested daily calorie target using Mifflin-St Jeor BMR, a light-activity
 * multiplier, and a 500 kcal deficit when the goal is to lose weight.
 * Approximate by design — the app tells users so.
 */
export function suggestedCalorieTarget(
  profile: Pick<UserProfile, 'sex' | 'dob' | 'heightCm' | 'weightKg' | 'goalWeightKg'>,
): number | null {
  const { sex, heightCm, weightKg, goalWeightKg } = profile
  const age = ageFromDob(profile.dob) ?? 40
  if (!heightCm || !weightKg) return null
  // Mifflin-St Jeor constant: +5 male, -161 female, midpoint when unspecified
  const sexConstant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant
  const maintenance = bmr * 1.35 // light activity
  const losing = goalWeightKg !== undefined && goalWeightKg < weightKg - 0.5
  const target = losing ? maintenance - 500 : maintenance
  return Math.max(1200, Math.round(target / 50) * 50)
}
