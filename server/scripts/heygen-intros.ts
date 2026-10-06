/**
 * Make every coach's intro clip speak in the coach's real voice, via HeyGen v3.
 *
 *   HEYGEN_API_KEY=... ELEVENLABS_API_KEY=... node --no-warnings=ExperimentalWarning scripts/heygen-intros.ts [coachId ...] [--dry]
 *
 * Two paths, chosen per coach:
 *  - EXISTING clip in public/coaches/<id>.mp4  → precision lip-sync (POST /v3/lipsyncs): the approved face and
 *    framing stay, the mouth is re-animated to the coach's ElevenLabs line.
 *  - NO clip yet                                → image-to-video (POST /v3/videos, type "image", Avatar IV): a
 *    portrait in data/heygen/<id>-face.(jpg|png) speaks the line. Put the reviewed face there first.
 *
 * Steps for each coach: generate the intro line through the app's own speak() (so it is the exact
 * voiceId that calls them) → upload audio (+ video or face) as assets → start the job → poll → download →
 * normalise with ffmpeg to the house format (720×1280, H.264 + AAC, faststart, ~2 MB) → write
 * public/coaches/<id>.mp4 → mark the manifest entry dubbed to this voiceId.
 *
 * Intro lines live in public/coaches/manifest.json (`line`); new coaches take theirs from INTRO_LINES below
 * (the same lines as the generation prompts in docs/coach-roster.md).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { COACHES } from '../shared/coaches.ts'
import { openDb, useDb } from '../src/lib/db.ts'
import { speak } from '../src/audio/speak.ts'

const KEY = process.env.HEYGEN_API_KEY
if (!KEY) throw new Error('HEYGEN_API_KEY is not set')
const API = 'https://api.heygen.com'
const H = { 'X-Api-Key': KEY }
const root = fileURLToPath(new URL('../../', import.meta.url))
const pub = `${root}public/coaches/`
const work = `${root}server/data/heygen/`
mkdirSync(work, { recursive: true })

const INTRO_LINES: Record<string, string> = {
  fiona: "Morning. I'm Fiona. Two boxes: done, not done. I only read the first one. Let's get you in it.",
  karim: "Hi, I'm Karim. Before anything else, one breath. Notice what's here. Then we decide. I'll be with you for both.",
  priya: "Alright, I'm Priya. I'm not above you, I'm beside you. You say what you'll do, I say when I'll check. Your word's on the table, and so's mine.",
  arun: "Hello, I'm Arun. We start at the finish line and walk back. Every goal gets a date, every date gets a job. Yours starts this week.",
  ken: "I'm Ken. Forty years around athletes taught me one thing. Build the base, recover on purpose, load a little more. Nobody peaks in week one.",
  grace: "I'm Grace. Plain truth, plain food, early night. Nobody's coming to do it for you. Good, you've got hands. Come on.",
}

/** Prompts for brand-new synthetic faces (no real person). Same character descriptions as docs/coach-roster.md. */
const FACE_PROMPTS: Record<string, string> = {
  fiona: 'Head-and-shoulders portrait of a white Scottish woman in her early 30s, athletic, dark red hair pulled back tight, no make-up, grey technical t-shirt, composed level expression with the hint of a dry half-smile, looking straight into a phone camera, bright modern kitchen with morning light softly blurred behind, natural matte skin, visible pores, no retouching, 35mm f/2.',
  karim: 'Head-and-shoulders portrait of a British Lebanese man in his mid 40s, olive skin, short dark hair greying at the temples, neat beard, soft navy jumper, relaxed gentle expression, looking straight into a phone camera, calm living room with a plant and a window softly blurred behind, late-afternoon light, natural matte skin, visible pores, no retouching, 35mm f/2.',
  priya: 'Head-and-shoulders portrait of a British Indian woman in her early 40s, medium-brown skin, shoulder-length black hair, hoop earrings, mustard-yellow hoodie, warm friendly grin, looking straight into a phone camera held at arm\'s length, leafy suburban street softly blurred behind, daylight, natural matte skin, visible pores, no retouching, 35mm f/2.',
  arun: 'Head-and-shoulders portrait of a British Indian man in his mid 50s, brown skin, close-cropped grey hair and trimmed grey beard, rimless glasses, pale blue shirt with sleeves rolled, calm organised expression, looking straight into a phone camera, tidy home office with a wall calendar softly blurred behind, afternoon light, natural matte skin, visible pores, no retouching, 35mm f/2.',
  ken: 'Head-and-shoulders portrait of a British Chinese man in his mid 60s, short grey hair, lean weathered face, dark zip-up track top with a stopwatch on a lanyard, steady kind expression, looking straight into a phone camera, edge of a running track in soft early light softly blurred behind, natural matte skin, visible pores, no retouching, 35mm f/2.',
  grace: 'Head-and-shoulders portrait of a Black British woman in her mid 60s, dark skin, short silver-grey natural hair, reading glasses pushed up on her head, bright patterned blouse, straight-backed direct expression with a dry twinkle, looking straight into a phone camera, warm family kitchen with a pot on the stove softly blurred behind, natural matte skin, visible pores, no retouching, 35mm f/2.',
}

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const ids = args.filter((a) => !a.startsWith('--'))
const targets = COACHES.filter((c) => (ids.length ? ids.includes(c.id) : true))
const manifestPath = `${pub}manifest.json`
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

async function api<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } })
  const body = (await res.json().catch(() => ({}))) as { data?: T; error?: { message?: string } | string | null; message?: string }
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${typeof body.error === 'string' ? body.error : body.error?.message ?? body.message ?? JSON.stringify(body).slice(0, 300)}`)
  return (body.data ?? body) as T
}

async function upload(file: string, type: string): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([readFileSync(file)], { type }), file.split('/').pop())
  const r = await api<{ asset_id: string }>('/v3/assets', { method: 'POST', body: form })
  return r.asset_id
}

async function poll(path: string): Promise<{ video_url: string; duration?: number }> {
  for (let i = 0; i < 120; i++) {
    const r = await api<{ status: string; video_url?: string; duration?: number; failure_message?: string; error?: unknown }>(path, { method: 'GET' })
    if (r.status === 'completed' && r.video_url) return { video_url: r.video_url, duration: r.duration }
    if (r.status === 'failed') throw new Error(`${path} failed: ${r.failure_message ?? JSON.stringify(r.error ?? r).slice(0, 300)}`)
    process.stdout.write(`\r  ${path} … ${r.status}            `)
    await new Promise((res) => setTimeout(res, 10_000))
  }
  throw new Error(`${path}: timed out`)
}

const probe = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim())

/**
 * HeyGen's lip-sync needs the new audio and the source video within 15% of each other.
 * Pad the line with a short silence either side, then cut the clip to that length — or, when the
 * line is longer than the clip, extend the clip by playing it back and forth (ping-pong) to fit.
 */
function fitVideoToAudio(video: string, audioIn: string, audioOut: string, videoOut: string): number {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', audioIn, '-af', 'adelay=400|400,apad=pad_dur=0.4', '-c:a', 'libmp3lame', '-q:a', '2', audioOut])
  const target = probe(audioOut)
  const src = probe(video)
  const silent = videoOut.replace(/\.mp4$/, '-silent.mp4')
  if (target <= src) {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-t', target.toFixed(2), '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', silent])
  } else {
    const loops = Math.ceil(target / src)
    const parts = Array.from({ length: loops }, (_, i) => (i % 2 ? `[r]` : `[f]`)).join('')
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-filter_complex',
      `[0:v]split=2[a][b];[a]copy[f];[b]reverse[r];${parts}concat=n=${loops}:v=1:a=0,trim=duration=${target.toFixed(2)}[out]`,
      '-map', '[out]', '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', silent])
  }
  // HeyGen rejects a source video with no audio track: mux the new line in as its soundtrack (it gets replaced anyway)
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', silent, '-i', audioOut, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', videoOut])
  return target
}

/** House format: portrait 720×1280, H.264 + AAC, faststart, sized like the originals */
function normalise(src: string, dest: string) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src,
    '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '25',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', dest])
}

useDb(openDb(':memory:'))

for (const c of targets) {
  if (!c.voiceId) { console.log(`${c.id}: no voiceId yet, skipping`); continue }
  const existing = `${pub}${c.id}.mp4`
  const face = ['jpg', 'png'].map((e) => `${work}${c.id}-face.${e}`).find(existsSync)
  const line = manifest.clips[c.id]?.line || INTRO_LINES[c.id]
  if (!line) { console.log(`${c.id}: no intro line known, skipping`); continue }
  const mode = existsSync(existing) ? 'lipsync' : face ? 'image' : FACE_PROMPTS[c.id] ? 'prompt' : null
  if (!mode) { console.log(`${c.id}: no clip, no face image and no face prompt — nothing to do`); continue }
  console.log(`\n${c.name} (${c.id}) → ${mode} in voice ${c.voiceId}\n  "${line}"`)
  if (dry) continue

  // 1. The line, in the exact voice that calls them
  const r = await speak({ userId: null, coachId: c.id, text: line })
  if (!r.ok) throw new Error(`${c.id}: speak fell back (${r.reason})`)
  const audioPath = `${work}${c.id}-line.mp3`
  writeFileSync(audioPath, r.audio)
  const audioId = await upload(audioPath, 'audio/mpeg')

  // 2. The job
  let out: { video_url: string; duration?: number }
  if (mode === 'lipsync') {
    const fittedAudio = `${work}${c.id}-line-fitted.mp3`
    const fittedVideo = `${work}${c.id}-source-fitted.mp4`
    const secs = fitVideoToAudio(existing, audioPath, fittedAudio, fittedVideo)
    console.log(`  fitted clip to ${secs.toFixed(1)}s`)
    const fittedAudioId = await upload(fittedAudio, 'audio/mpeg')
    const videoId = await upload(fittedVideo, 'video/mp4')
    const job = await api<{ lipsync_id?: string; id?: string }>('/v3/lipsyncs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video: { type: 'asset_id', asset_id: videoId }, audio: { type: 'asset_id', asset_id: fittedAudioId }, mode: 'precision', title: `Be More — ${c.name} intro` }),
    })
    out = await poll(`/v3/lipsyncs/${job.lipsync_id ?? job.id}`)
  } else if (mode === 'prompt') {
    // A brand-new synthetic character from the roster's description, then that look speaks the line
    const look = await api<{ look_id?: string; id?: string; avatar_id?: string }>('/v3/avatars', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'prompt', prompt: FACE_PROMPTS[c.id], aspect_ratio: '9:16', name: `Be More — ${c.name}` }),
    })
    const lookId = look.look_id ?? look.avatar_id ?? look.id
    let preview = ''
    for (let i = 0; i < 60; i++) {
      const r = await api<{ status: string; preview_image_url?: string; failure_message?: string }>(`/v3/avatars/looks/${lookId}`, { method: 'GET' })
      if (r.status === 'completed') { preview = r.preview_image_url ?? ''; break }
      if (r.status === 'failed') throw new Error(`${c.id}: avatar generation failed: ${r.failure_message ?? ''}`)
      process.stdout.write(`\r  look ${lookId} … ${r.status}        `)
      await new Promise((res) => setTimeout(res, 8_000))
    }
    if (preview) writeFileSync(`${work}${c.id}-face.jpg`, new Uint8Array(await (await fetch(preview)).arrayBuffer()))
    console.log(`\n  face saved to ${work}${c.id}-face.jpg — REVIEW IT (no resemblance to a real person) before shipping`)
    const job = await api<{ video_id?: string; id?: string }>('/v3/videos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'avatar', avatar_id: lookId, audio_asset_id: audioId, aspect_ratio: '9:16', resolution: '720p', engine: { type: 'avatar_iv' }, title: `Be More — ${c.name} intro` }),
    })
    out = await poll(`/v3/videos/${job.video_id ?? job.id}`)
  } else {
    const imageId = await upload(face!, face!.endsWith('.png') ? 'image/png' : 'image/jpeg')
    const job = await api<{ video_id?: string; id?: string }>('/v3/videos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'image', image: { type: 'asset_id', asset_id: imageId }, audio_asset_id: audioId, aspect_ratio: '9:16', resolution: '720p', engine: { type: 'avatar_iv' }, title: `Be More — ${c.name} intro` }),
    })
    out = await poll(`/v3/videos/${job.video_id ?? job.id}`)
  }

  // 3. Download, normalise, install
  const raw = `${work}${c.id}-heygen.mp4`
  writeFileSync(raw, new Uint8Array(await (await fetch(out.video_url)).arrayBuffer()))
  const tmp = `${work}${c.id}-final.mp4`
  normalise(raw, tmp)
  if (existsSync(existing)) renameSync(existing, `${work}${c.id}-before-dub.mp4`)
  renameSync(tmp, existing)
  console.log(`\n  ✓ ${existing} (${out.duration?.toFixed(1) ?? '?'}s)`)

  // 4. Record it
  manifest.clips[c.id] = { ...(manifest.clips[c.id] ?? {}), coachId: c.id, file: `coaches/${c.id}.mp4`, line, generatedWith: `${manifest.clips[c.id]?.generatedWith ?? (mode === 'prompt' ? 'heygen:prompt-to-avatar + avatar_iv' : 'heygen:image-to-video (avatar_iv)')}; dubbed via heygen:${mode === 'lipsync' ? 'lipsync-precision' : 'audio-driven render'}`, voiceId: c.voiceId, dubbed: true }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
console.log('\nNow run: node --no-warnings=ExperimentalWarning scripts/intro-manifest.ts   (recomputes hashes; add --done once every coach is dubbed)')
