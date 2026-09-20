/**
 * Accountability pricing. The subscription has a base price; miss too many
 * calls in a month and next month costs more; answer nearly all of them and
 * next month costs less. Stated up front on the "deal" screen — the person
 * agrees to it knowingly, which is the point (and a legal requirement).
 */
export const PRICING = {
  currency: '£',
  basePence: 1999,
  /** Missed calls per month you can have with no consequence */
  graceMissed: 4,
  /** Each missed call beyond the grace adds this to next month */
  penaltyPencePerMiss: 250,
  /** Ceiling for the penalty — the "you really didn't show up" price */
  maxPenaltyPence: 2000,
  /** Answer at least this share of calls (with at least this many scheduled) and next month gets the credit */
  creditAnswerRate: 0.9,
  creditMinCalls: 20,
  creditPence: 500,
}

export interface AccountabilityMonth {
  month: string // YYYY-MM
  scheduled: number
  answered: number
  missed: number
  pending: number
  answerRate: number | null
  /** misses left before the price starts rising (0 when already rising) */
  missesUntilPenalty: number
  penaltyPence: number
  creditPence: number
  nextMonthPence: number
}

export function accountability(month: string, statuses: string[]): AccountabilityMonth {
  const answered = statuses.filter((s) => s === 'answered').length
  const missed = statuses.filter((s) => s === 'missed').length
  const pending = statuses.filter((s) => s === 'pending' || s === 'sent').length
  const scheduled = statuses.length
  const decided = answered + missed
  const answerRate = decided ? answered / decided : null
  const penaltyPence = Math.min(PRICING.maxPenaltyPence, Math.max(0, missed - PRICING.graceMissed) * PRICING.penaltyPencePerMiss)
  const creditPence =
    answerRate !== null && decided >= PRICING.creditMinCalls && answerRate >= PRICING.creditAnswerRate && penaltyPence === 0
      ? PRICING.creditPence
      : 0
  return {
    month,
    scheduled,
    answered,
    missed,
    pending,
    answerRate,
    missesUntilPenalty: Math.max(0, PRICING.graceMissed + 1 - missed),
    penaltyPence,
    creditPence,
    nextMonthPence: PRICING.basePence + penaltyPence - creditPence,
  }
}

export function pounds(pence: number): string {
  return `${PRICING.currency}${(pence / 100).toFixed(2)}`
}

/** The rule in one sentence, for the deal screen and Settings */
export function pricingRule(): string {
  return `${pounds(PRICING.basePence)} a month. Miss more than ${PRICING.graceMissed} calls in a month and each extra miss adds ${pounds(PRICING.penaltyPencePerMiss)} to next month (up to ${pounds(PRICING.basePence + PRICING.maxPenaltyPence)}). Answer ${Math.round(PRICING.creditAnswerRate * 100)}% or more and next month is ${pounds(PRICING.creditPence)} cheaper.`
}
