/**
 * Discovery. The coach doesn't interrogate; it learns the person over the
 * first week of calls, one high-value question at a time, and stores what
 * it learns. These are the things a serious coach needs to know before
 * prescribing anything — and the diagnosis when execution slips.
 */
export const INTAKE_FIELDS = [
  { id: 'why', label: 'Why this goal, really', ask: 'what achieving it would actually change for them — the reason under the reason' },
  { id: 'day_in_the_life', label: 'A day in their life when it is done', ask: 'to describe an ordinary Tuesday a year after the goal is reached, in the present tense — waking up, the morning, what they eat, who they see, how their body feels, what they no longer do. Names, places, numbers. Specific beats grand' },
  { id: 'success', label: 'What success looks like', ask: 'what they will see, feel or be able to do when it is done — concrete evidence, not a number' },
  { id: 'baseline', label: 'Where they are now', ask: 'an honest picture of the current state — the number, the habit, the situation today' },
  { id: 'tried', label: 'What they have tried before', ask: 'what they have tried before and what happened' },
  { id: 'failure_pattern', label: 'What usually derails them', ask: 'what usually causes them to stop — the pattern, not the excuse' },
  { id: 'avoiding', label: 'What they are avoiding', ask: 'the one thing they know they should do but keep not doing' },
  { id: 'constraints', label: 'Constraints', ask: 'what genuinely limits them — time, money, health, family, work' },
  { id: 'resources', label: 'Resources', ask: 'what they have going for them — skills, people, money, time, equipment' },
  { id: 'competing', label: 'Competing priorities', ask: 'what else is pulling at their time and attention right now' },
  { id: 'environment', label: 'Environment', ask: 'whether the people and places around them make this easier or harder' },
  { id: 'standard', label: 'The standard they hold themselves to', ask: 'what "good enough" looks like to them, and whether that standard is the problem or the solution' },
  { id: 'who_they_become', label: 'Who they have to be, day to day', ask: 'what kind of person they have to be on an ordinary day to make the goal inevitable — the habits that person has, and the ones they no longer have' },
  { id: 'people_around', label: 'The five people who matter', ask: 'who the five most important people in their life are, and whether each one makes this goal easier or harder' },
  { id: 'advice_to_self', label: 'Advice from their future self', ask: 'the one piece of advice the version of them who has done this would send back to them today' },
] as const

export type IntakeField = (typeof INTAKE_FIELDS)[number]['id']

export function intakeBlock(known: Record<string, string>): string {
  const knownLines = INTAKE_FIELDS.filter((f) => known[f.id]).map((f) => `- ${f.label}: ${known[f.id]}`)
  const unknown = INTAKE_FIELDS.filter((f) => !known[f.id])
  const next = unknown[0]
  return `DISCOVERY (what you know about them as a coach, and what you still need to learn)
${knownLines.join('\n') || '(nothing yet — early days)'}
${unknown.length ? `Still to learn (${unknown.length}): ${unknown.map((f) => f.label.toLowerCase()).join('; ')}.
On this call, after the brief and before you sign off, ask ONE question to learn: ${next.label.toLowerCase()} — i.e. ${next.ask}. One question, in your own words, then listen. Never more than one discovery question per call.` : 'You know them well now. Use it: reference their why on hard days, their pattern when they slip, their avoiding when they stall.'}`
}
