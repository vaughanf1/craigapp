/**
 * The audio layer's one seam. A provider turns text into bytes for a given
 * voice; everything else (cache, caps, cost log, fallback) lives above it and
 * does not care who the provider is. The phone pipeline plugs in here later by
 * asking for `ulaw_8000` instead of `mp3`.
 */
export type AudioFormat = 'mp3' | 'ulaw_8000'

export interface SynthesisRequest {
  text: string
  voiceId: string
  format: AudioFormat
}

export interface SynthesisResult {
  audio: Uint8Array
  mime: string
}

export interface TtsProvider {
  readonly id: string
  readonly model: string
  synthesize(req: SynthesisRequest): Promise<SynthesisResult>
}

export const MIME: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  ulaw_8000: 'audio/basic',
}
