import { describe, it, expect } from 'vitest'
import { formatWeight, parseWeightToKg, halfwayKg } from '../shared/units.ts'
import { localParts, shiftDate, localDayRange } from '../src/lib/time.ts'
import { escapeXml, twiml } from '../src/lib/twilio.ts'
import { normalisePhone } from '../src/lib/auth.ts'
import { kindForSlot } from '../src/scheduler.ts'

describe('weight units', () => {
  it('formats stone and pounds the way Craig says them', () => {
    expect(formatWeight(83.5, 'stone')).toBe('13 stone 2')
    expect(formatWeight(76.2, 'stone')).toBe('12 stone')
    expect(formatWeight(83.5, 'lbs')).toBe('184 lbs')
    expect(formatWeight(83.5, 'kg')).toBe('83.5 kg')
    expect(formatWeight(69.853, 'stone')).toBe('11 stone')
  })
  it('parses what people actually type', () => {
    expect(parseWeightToKg('13 stone 2')!).toBeCloseTo(83.46, 1)
    expect(parseWeightToKg('13st 2lb')!).toBeCloseTo(83.46, 1)
    expect(parseWeightToKg('190 lbs')!).toBeCloseTo(86.18, 1)
    expect(parseWeightToKg('78 kg')).toBe(78)
    expect(parseWeightToKg('a lot')).toBeNull()
  })
  it('proposes the halfway milestone', () => {
    expect(halfwayKg(83.5, 70)).toBe(77)
  })
})

describe('local time', () => {
  it('reports the user\'s local date and HH:MM', () => {
    const at = new Date('2026-09-18T23:30:00Z')
    expect(localParts('Europe/London', at)).toMatchObject({ date: '2026-09-19', time: '00:30' })
    expect(localParts('America/New_York', at)).toMatchObject({ date: '2026-09-18', time: '19:30' })
    expect(localParts('Not/AZone', at).date).toBe('2026-09-18')
  })
  it('shifts dates across month ends', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('computes the UTC range of a local day', () => {
    const r = localDayRange('Europe/London', '2026-07-01') // BST, UTC+1
    expect(new Date(r.start).toISOString()).toBe('2026-06-30T23:00:00.000Z')
    expect(r.end - r.start).toBe(86400_000)
  })
})

describe('twiml', () => {
  it('escapes what the coach says', () => {
    expect(escapeXml('Tom & Jerry <3 "quotes"')).toBe('Tom &amp; Jerry &lt;3 &quot;quotes&quot;')
  })
  it('gathers speech when there is an action, hangs up otherwise', () => {
    const talk = twiml({ voice: 'Polly.Amy-Neural', say: 'Hi', gatherAction: 'https://x/g?t=1' })
    expect(talk).toContain('<Gather input="speech"')
    expect(talk).toContain('action="https://x/g?t=1"')
    const bye = twiml({ voice: 'Polly.Amy-Neural', say: 'Bye' })
    expect(bye).not.toContain('<Gather')
    expect(bye).toContain('<Hangup/>')
  })
})

describe('phone numbers', () => {
  it('normalises UK and international formats to E.164', () => {
    expect(normalisePhone('07700 900123')).toBe('+447700900123')
    expect(normalisePhone('+1 (415) 555-0100')).toBe('+14155550100')
    expect(normalisePhone('0044 7700 900123')).toBe('+447700900123')
    expect(normalisePhone('415 555 0100', '+1')).toBe('+14155550100')
    expect(normalisePhone('hello')).toBeNull()
  })
})

describe('scheduler slots', () => {
  it('last slot of the day is the evening review', () => {
    expect(kindForSlot('09:00', ['09:00', '19:00'])).toBe('morning')
    expect(kindForSlot('19:00', ['09:00', '19:00'])).toBe('evening')
    expect(kindForSlot('13:00', ['09:00', '13:00', '19:00'])).toBe('morning')
    expect(kindForSlot('08:30', ['08:30'])).toBe('morning')
    expect(kindForSlot('20:00', ['20:00'])).toBe('evening')
  })
})
