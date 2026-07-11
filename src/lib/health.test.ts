import { describe, expect, it } from 'vitest'
import { suggestedCalorieTarget } from './health'

function dobForAge(age: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - age)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

describe('suggestedCalorieTarget', () => {
  it('needs height and weight', () => {
    expect(suggestedCalorieTarget({ dob: dobForAge(40) })).toBeNull()
    expect(suggestedCalorieTarget({ dob: dobForAge(40), heightCm: 175 })).toBeNull()
  })

  it('gives a plausible maintenance target for an average man', () => {
    const target = suggestedCalorieTarget({
      sex: 'male',
      dob: dobForAge(40),
      heightCm: 178,
      weightKg: 80,
    })!
    expect(target).toBeGreaterThan(2100)
    expect(target).toBeLessThan(2700)
  })

  it('applies a deficit when losing weight', () => {
    const base = { sex: 'male' as const, dob: dobForAge(40), heightCm: 178, weightKg: 90 }
    const maintain = suggestedCalorieTarget(base)!
    const lose = suggestedCalorieTarget({ ...base, goalWeightKg: 80 })!
    expect(maintain - lose).toBe(500)
  })

  it('never goes below a safe floor', () => {
    const target = suggestedCalorieTarget({
      sex: 'female',
      dob: dobForAge(70),
      heightCm: 150,
      weightKg: 45,
      goalWeightKg: 42,
    })!
    expect(target).toBeGreaterThanOrEqual(1200)
  })
})
