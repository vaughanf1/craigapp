import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRICING, accountability, pounds } from '../lib/pricing'
import { Card } from './ui'

/**
 * The deal, explained. Why the price moves with whether you pick up the phone,
 * what's forgiven, what it costs, and what you get back. Every number comes
 * from PRICING so the page can't drift from the rule the server enforces.
 * Shown as an onboarding step, on /deal, and linked from the commit screen.
 */
export default function DealExplainer({ coachName: coachProp, scheduledPerMonth = 60 }: { coachName?: string; scheduledPerMonth?: number }) {
  // Mid-sentence the coach is "Fiona" or "your coach"; at the start of a sentence, "Your coach"
  const coachName = coachProp ?? 'your coach'
  const Coach = coachName[0].toUpperCase() + coachName.slice(1)
  const [missed, setMissed] = useState(2)
  const month = useMemo(() => {
    const statuses = [...Array(scheduledPerMonth - missed).fill('answered'), ...Array(missed).fill('missed')]
    return accountability('demo', statuses)
  }, [missed, scheduledPerMonth])

  const base = pounds(PRICING.basePence)
  const cap = pounds(PRICING.basePence + PRICING.maxPenaltyPence)
  const cheapest = pounds(PRICING.basePence - PRICING.creditPence)
  const perMiss = pounds(PRICING.penaltyPencePerMiss)
  const credit = pounds(PRICING.creditPence)
  const rate = Math.round(PRICING.creditAnswerRate * 100)

  const verdict = month.penaltyPence
    ? `${missed} missed. ${PRICING.graceMissed} were forgiven, ${missed - PRICING.graceMissed} weren't. Next month is ${pounds(month.nextMonthPence)}.`
    : month.creditPence
      ? `${missed} missed, ${month.answered} answered. That's ${Math.round((month.answerRate ?? 0) * 100)}%. Next month is ${pounds(month.nextMonthPence)}, the cheapest it gets.`
      : `${missed} missed, all forgiven. Next month stays at ${pounds(month.nextMonthPence)}.`

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">The deal</p>
        <h1 className="display-tight mt-3 text-3xl font-semibold sm:text-4xl">You pay for the push. So pick up.</h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-secondary">
          A gym you never go to costs the same as one you do. We don't think that's honest. {Coach} rings you twice a
          day, and what you pay next month depends on whether you answer. Not on how the day went. Only on whether you
          showed up for the call.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Show up</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{base}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            A month of calls. Answer most of them and this is what you pay. Miss up to {PRICING.graceMissed} and nothing changes.
          </p>
        </Card>
        <Card className="p-5 ring-1 ring-leaf/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-leaf">Show up nearly every time</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-leaf">{cheapest}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Answer {rate}% or more of at least {PRICING.creditMinCalls} calls and next month is {credit} cheaper. Consistency is the only discount we offer.
          </p>
        </Card>
        <Card className="p-5 ring-1 ring-coral/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-coral">Keep not showing up</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-coral">up to {cap}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Beyond the {PRICING.graceMissed} forgiven misses, every unanswered call adds {perMiss} to next month. It stops at {cap}, however bad the month.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">Try a month</p>
          <p className="text-sm text-ink-secondary tabular-nums">{scheduledPerMonth} calls scheduled</p>
        </div>
        <label className="mt-4 block">
          <span className="flex items-baseline justify-between text-sm">
            <span className="text-ink-secondary">Calls you miss</span>
            <span className="text-lg font-semibold tabular-nums">{missed}</span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.min(scheduledPerMonth, PRICING.graceMissed + PRICING.maxPenaltyPence / PRICING.penaltyPencePerMiss + 4)}
            value={missed}
            onChange={(e) => setMissed(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-accent,#0a84ff)]"
            aria-label="Missed calls this month"
          />
        </label>
        <div className="mt-4 flex items-end justify-between gap-4">
          <p className="max-w-[60%] text-sm leading-relaxed text-ink-secondary">{verdict}</p>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-ink-secondary">Next month</p>
            <p className={`text-3xl font-semibold tabular-nums ${month.penaltyPence ? 'text-coral' : month.creditPence ? 'text-leaf' : ''}`}>
              {pounds(month.nextMonthPence)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-black/5 p-0">
        <Row title="Life happens. We know." body={`${PRICING.graceMissed} missed calls a month are forgiven, no questions, no note from your mum. A funeral, a sick child, a flight: covered. The price only moves when missing becomes the habit.`} />
        <Row title="Going away? Pause it." body={`Turn the calls off in Settings for a holiday or a hospital stay. A call that was never scheduled can't be missed, and ${coachName} picks up where you left off.`} />
        <Row title="Nothing changes mid-month." body="Whatever happens, this month's price is this month's price. The tally only ever affects next month, and it's capped." />
        <Row title="You always see the count." body={`The tally and next month's price sit on your Today screen and in Settings. ${Coach} knows it too, and will say so, once, plainly, before it costs you anything.`} />
        <Row title="Talking is free." body="Messaging your coach, logging food, checking the plan: none of it affects the price. Only the scheduled calls count, because the call is the one thing you can't do on autopilot." />
      </Card>

      <p className="text-center text-xs leading-relaxed text-ink-secondary">
        Preview: no payment is taken yet. The rule, in full: {pounds(PRICING.basePence)} a month; more than {PRICING.graceMissed} missed calls adds {perMiss} per miss to the next month, capped at {cap}; answer {rate}% or more of at least {PRICING.creditMinCalls} calls and the next month is {credit} less.{' '}
        <Link to="/terms" className="underline">Terms</Link>
      </p>
    </div>
  )
}

function Row({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{body}</p>
    </div>
  )
}
