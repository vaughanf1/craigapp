import type { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { anthropic, MODEL, FALLBACK_BETAS, FALLBACKS } from './client.ts'

/**
 * One door to the model. The coach brain doesn't care which provider is
 * behind it: OpenAI when OPENAI_API_KEY is set, otherwise Anthropic.
 * Two shapes: free text (a reply on a call) and JSON matching a zod schema
 * (memory, briefs, plans, reviews).
 */

export type Effort = 'low' | 'medium' | 'high'
export interface LlmRequest {
  /** System blocks; the first is stable per coach and cached where the provider supports it */
  system: string[]
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens: number
  effort: Effort
}

export function provider(): 'openai' | 'anthropic' {
  return process.env.OPENAI_API_KEY ? 'openai' : 'anthropic'
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.5'

let openaiClient: OpenAI | null = null
function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ maxRetries: 2, timeout: 90_000 })
  return openaiClient
}

export function modelName(): string {
  return provider() === 'openai' ? OPENAI_MODEL : MODEL
}

/** Free-text completion. Throws on refusal or empty output. */
export async function completeText(req: LlmRequest): Promise<string> {
  if (provider() === 'openai') {
    const r = await openai().responses.create({
      model: OPENAI_MODEL,
      instructions: req.system.join('\n\n'),
      input: req.messages,
      reasoning: { effort: req.effort },
      max_output_tokens: req.maxTokens,
    })
    const text = r.output_text.trim()
    if (!text) throw new Error('Empty response from model')
    return text
  }
  const response = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: req.maxTokens,
    betas: FALLBACK_BETAS,
    fallbacks: FALLBACKS,
    thinking: { type: 'adaptive' },
    output_config: { effort: req.effort },
    system: req.system.map((text, i) => (i === 0 ? { type: 'text' as const, text, cache_control: { type: 'ephemeral' as const } } : { type: 'text' as const, text })),
    messages: req.messages,
  })
  if (response.stop_reason === 'refusal') throw new Error('The coach could not respond to that message')
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!text) throw new Error('Empty response from model')
  return text
}

/** Structured completion: returns the parsed object, or null if the model produced nothing usable. */
export async function completeJson<T>(req: LlmRequest & { schema: z.ZodType<T>; name: string }): Promise<T | null> {
  if (provider() === 'openai') {
    const r = await openai().responses.parse({
      model: OPENAI_MODEL,
      instructions: req.system.join('\n\n'),
      input: req.messages,
      reasoning: { effort: req.effort },
      max_output_tokens: req.maxTokens,
      text: { format: zodTextFormat(req.schema, req.name) },
    })
    return (r.output_parsed as T | null) ?? null
  }
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: req.maxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: req.effort, format: zodOutputFormat(req.schema) },
    system: req.system.map((text, i) => (i === 0 ? { type: 'text' as const, text, cache_control: { type: 'ephemeral' as const } } : { type: 'text' as const, text })),
    messages: req.messages,
  })
  return (response.parsed_output as T | null) ?? null
}
