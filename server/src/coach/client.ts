import Anthropic from '@anthropic-ai/sdk'

/** One client for the process — credentials come from the SDK's own chain (ANTHROPIC_API_KEY or `ant auth login`). */
let client: Anthropic | null = null
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 60_000 })
  return client
}

export const MODEL = 'claude-opus-5'
/** Where Claude Opus 5 declines on safety grounds, the request re-runs on Opus 4.8 server-side */
export const FALLBACK_BETAS = ['server-side-fallback-2026-06-01']
export const FALLBACKS = [{ model: 'claude-opus-4-8' }]

/** Test hook: swap the client for a stub */
export function setClientForTests(c: Anthropic) {
  client = c
}
