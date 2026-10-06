/**
 * Create the twelve coach voices with ElevenLabs Voice Design — synthetic voices
 * generated from each coach's `voiceDesign` text. No real person is cloned.
 *
 *   ELEVENLABS_API_KEY=... node --no-warnings=ExperimentalWarning scripts/voices-create.ts [coachId ...]
 *
 * For each coach: ask for three previews, save them to data/voice-previews/<id>-<n>.mp3
 * so a human can listen, then create a voice from preview 1 and print the voice_id to
 * paste into server/shared/coaches.ts. Pass `--pick <id>=<n>` to use a different preview.
 * Endpoints follow the ElevenLabs Voice Design API (text-to-voice); check the current
 * docs if the API has moved: https://elevenlabs.io/docs/api-reference/text-to-voice
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { COACHES } from '../shared/coaches.ts'

const key = process.env.ELEVENLABS_API_KEY
if (!key) {
  console.error('ELEVENLABS_API_KEY is not set')
  process.exit(1)
}
const args = process.argv.slice(2)
const picks = new Map<string, number>()
for (let i = 0; i < args.length; i++) if (args[i] === '--pick') { const [id, n] = args[++i].split('='); picks.set(id, Number(n)) }
const ids = args.filter((a, i) => a !== '--pick' && args[i - 1] !== '--pick')
const targets = COACHES.filter((c) => (ids.length ? ids.includes(c.id) : true))
const headers = { 'xi-api-key': key, 'Content-Type': 'application/json' }
mkdirSync('data/voice-previews', { recursive: true })

/** The line each preview speaks — the coach's own intro so the voice is judged on their words */
const sample = (name: string) => `Hi, I'm ${name}, your Be More coach. I'll be the one calling you in the morning and again tonight. Let's get the first day done.`

for (const c of targets) {
  if (c.voiceId) { console.log(`${c.id}: already has voice ${c.voiceId}, skipping`); continue }
  const design = await fetch('https://api.elevenlabs.io/v1/text-to-voice/design', {
    method: 'POST', headers,
    body: JSON.stringify({ voice_description: c.voiceDesign, text: sample(c.name), model_id: 'eleven_ttv_v3' }),
  })
  if (!design.ok) { console.error(`${c.id}: design failed ${design.status} ${await design.text()}`); continue }
  const { previews } = (await design.json()) as { previews: { generated_voice_id: string; audio_base_64: string }[] }
  previews.forEach((p, i) => writeFileSync(`data/voice-previews/${c.id}-${i + 1}.mp3`, Buffer.from(p.audio_base_64, 'base64')))
  const chosen = previews[(picks.get(c.id) ?? 1) - 1] ?? previews[0]
  const create = await fetch('https://api.elevenlabs.io/v1/text-to-voice', {
    method: 'POST', headers,
    body: JSON.stringify({ voice_name: `Be More — ${c.name}`, voice_description: c.voiceDesign, generated_voice_id: chosen.generated_voice_id }),
  })
  if (!create.ok) { console.error(`${c.id}: create failed ${create.status} ${await create.text()}`); continue }
  const { voice_id } = (await create.json()) as { voice_id: string }
  console.log(`${c.id}: voiceId: '${voice_id}'   (${previews.length} previews saved to data/voice-previews/${c.id}-*.mp3)`)
}
