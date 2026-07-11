import { describe, expect, it } from 'vitest'
import { parseFood } from './food'

describe('parseFood — spoken meal descriptions', () => {
  it('parses "two slices of toast and a latte"', () => {
    const result = parseFood('two slices of toast and a latte')
    expect(result).toHaveLength(2)
    expect(result[0].label).toContain('toast')
    expect(result[0].quantity).toBe(2)
    expect(result[0].calories).toBe(260)
    expect(result[1].label).toBe('Latte')
    expect(result[1].calories).toBe(150)
  })

  it('parses a full day of eating with commas', () => {
    const result = parseFood('a bowl of porridge, chicken salad and a chocolate bar')
    expect(result.map((r) => r.label)).toEqual([
      'Bowl of porridge',
      'Chicken salad',
      'Chocolate bar',
    ])
  })

  it('prefers the longest matching phrase (chicken salad, not chicken)', () => {
    expect(parseFood('I had a chicken salad')[0].label).toBe('Chicken salad')
    expect(parseFood('fish and chips')[0].label).toBe('Fish & chips')
  })

  it('handles numeric quantities', () => {
    const result = parseFood('3 biscuits')
    expect(result[0].quantity).toBe(3)
    expect(result[0].calories).toBe(225)
  })

  it('respects word boundaries — "tea" does not match inside "steak"', () => {
    expect(parseFood('a steak')[0].label).toBe('Steak')
  })

  it('returns empty for unknown food', () => {
    expect(parseFood('flurbish wibbleton')).toHaveLength(0)
  })
})
