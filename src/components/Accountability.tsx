import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { accountability, pounds, pricingRule, type AccountabilityMonth } from '../lib/pricing'
import { Card } from './ui'

/** The tally that sets next month's price. Missed calls are the point of the product — this is where they bite. */
export function AccountabilityTile({ detailed = false }: { detailed?: boolean }) {
  const { online } = useStore()
  const [a, setA] = useState<AccountabilityMonth | null>(null)
  useEffect(() => {
    if (online) api.accountability().then(setA).catch(() => setA(null))
    else setA(accountability(new Date().toISOString().slice(0, 7), []))
  }, [online])
  if (!a) return null

  const tone = a.penaltyPence ? 'text-coral' : a.creditPence ? 'text-leaf' : 'text-ink'
  const headline = !a.scheduled
    ? 'No calls yet this month'
    : a.penaltyPence
      ? `${a.missed} missed · next month ${pounds(a.nextMonthPence)}`
      : a.creditPence
        ? `${a.answered} answered · ${pounds(a.creditPence)} off next month`
        : `${a.answered} of ${a.answered + a.missed} answered`

  return (
    <Card className={detailed ? 'p-5' : 'p-4'}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Calls this month</p>
        <p className="text-xs text-ink-secondary">next month {pounds(a.nextMonthPence)}</p>
      </div>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{headline}</p>
      {a.scheduled > 0 && !a.penaltyPence && (
        <p className="mt-0.5 text-sm text-ink-secondary">
          {a.missesUntilPenalty === 1
            ? 'One more missed call and the price goes up.'
            : `${a.missesUntilPenalty} missed calls before the price goes up.`}
        </p>
      )}
      {detailed && (
        <>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-black/[0.06]">
            {a.scheduled > 0 && (
              <>
                <div className="bg-leaf" style={{ width: `${(a.answered / a.scheduled) * 100}%` }} />
                <div className="bg-coral" style={{ width: `${(a.missed / a.scheduled) * 100}%` }} />
              </>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-secondary">{pricingRule()}</p>
        </>
      )}
    </Card>
  )
}
