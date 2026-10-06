import { env } from '../lib/env.ts'
import { MIME, type SynthesisRequest, type SynthesisResult, type TtsProvider } from './provider.ts'

/** ElevenLabs over plain fetch — no SDK needed for one endpoint. Stock/designed voices only; no cloning of real people. */
export class ElevenLabsProvider implements TtsProvider {
  readonly id = 'elevenlabs'
  readonly model = env.tts.model
  private readonly apiKey: string
  constructor(apiKey = env.tts.elevenLabsKey) {
    this.apiKey = apiKey
  }

  async synthesize(req: SynthesisRequest): Promise<SynthesisResult> {
    const output = req.format === 'ulaw_8000' ? 'ulaw_8000' : 'mp3_44100_64'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(req.voiceId)}?output_format=${output}`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json', Accept: MIME[req.format] },
      body: JSON.stringify({ text: req.text, model_id: this.model }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return { audio: new Uint8Array(await res.arrayBuffer()), mime: MIME[req.format] }
  }
}
