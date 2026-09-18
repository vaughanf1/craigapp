/** Local date (YYYY-MM-DD) and time (HH:MM) for a user in their timezone. */
export function localParts(timezone: string, at = new Date()): { date: string; time: string; weekday: string } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long',
    }).formatToParts(at)
  } catch {
    return localParts('UTC', at)
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const hour = get('hour') === '24' ? '00' : get('hour')
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
    weekday: get('weekday'),
  }
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Start of a local day as a UTC timestamp — approximate via offset of the current instant */
export function localDayRange(timezone: string, date: string): { start: number; end: number } {
  // Find the UTC instant at which the user's local clock reads 00:00 on `date`
  const probe = new Date(`${date}T00:00:00Z`).getTime()
  const offsetMs = tzOffsetMs(timezone, probe)
  const start = probe - offsetMs
  return { start, end: start + 24 * 3600 * 1000 }
}

function tzOffsetMs(timezone: string, at: number): number {
  const { date, time } = localParts(timezone, new Date(at))
  const asUtc = new Date(`${date}T${time}:00Z`).getTime()
  return asUtc - Math.floor(at / 60000) * 60000
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
