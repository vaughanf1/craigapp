/** Weight in the user's own words — Craig: "here it's stone and pounds, in America it's pounds". */
export function formatWeight(kg: number, unit: 'stone' | 'lbs' | 'kg' = 'stone'): string {
  if (unit === 'kg') return `${Math.round(kg * 10) / 10} kg`
  const totalLbs = kg * 2.20462
  if (unit === 'lbs') return `${Math.round(totalLbs)} lbs`
  const stone = Math.floor(totalLbs / 14)
  const lbs = Math.round(totalLbs - stone * 14)
  if (lbs === 14) return `${stone + 1} stone`
  return lbs === 0 ? `${stone} stone` : `${stone} stone ${lbs}`
}

export function parseWeightToKg(input: string): number | null {
  const s = input.toLowerCase().replace(/,/g, '.').trim()
  const st = s.match(/(\d+(?:\.\d+)?)\s*(?:stone|st)\s*(?:(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?)?/)
  if (st) return (Number(st[1]) * 14 + Number(st[2] ?? 0)) / 2.20462
  const lb = s.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/)
  if (lb) return Number(lb[1]) / 2.20462
  const kg = s.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)/)
  if (kg) return Number(kg[1])
  return null
}

/** Halfway point between current and goal — the coach proposes this as the first milestone. */
export function halfwayKg(current: number, goal: number): number {
  return Math.round(((current + goal) / 2) * 2) / 2
}

const CURRENCY = new Set(['£', '$', '€', '¥'])

/** A milestone metric for display: "£5,000" / "$200" (symbol first, no space), "10 km", "3 books". Weight uses formatWeight. */
export function formatMetric(target: number, unit: string): string {
  const u = unit.trim()
  const n = Number.isInteger(target) ? target.toLocaleString('en-GB') : String(target)
  if (CURRENCY.has(u)) return `${u}${n}`
  const code = u.toUpperCase()
  if (code === 'GBP') return `£${n}`
  if (code === 'USD') return `$${n}`
  if (code === 'EUR') return `€${n}`
  if (u === '%') return `${n}%`
  return u ? `${n} ${u}` : n
}
