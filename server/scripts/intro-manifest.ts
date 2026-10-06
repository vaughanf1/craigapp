/**
 * Record how each intro clip in public/coaches/ was made, and which voice it
 * speaks in, so the clip and the call voice can't drift apart. Run after adding
 * or re-dubbing a clip:
 *
 *   node --no-warnings=ExperimentalWarning scripts/intro-manifest.ts [--dubbed <coachId> ...]
 *
 * `--dubbed <id>` marks that coach's clip as lip-synced to their current voiceId.
 * The manifest test fails if a coach has a voiceId but their clip isn't dubbed to it.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { COACHES } from '../shared/coaches.ts'

const dir = new URL('../../public/coaches/', import.meta.url)
const manifestPath = new URL('manifest.json', dir)
type Entry = { coachId: string; file: string; sha256: string; bytes: number; line: string; generatedWith: string; voiceId: string | null; dubbed: boolean }
const previousDoc = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { clips: {}, dubbingDone: false }
const previous: Record<string, Entry> = previousDoc.clips ?? {}
const dubbed = new Set<string>()
process.argv.slice(2).forEach((a, i, all) => { if (all[i - 1] === '--dubbed') dubbed.add(a) })

const clips: Record<string, Entry> = {}
for (const c of COACHES) {
  const file = new URL(`${c.id}.mp4`, dir)
  if (!existsSync(file)) continue
  const buf = readFileSync(file)
  const prev = previous[c.id]
  const isDubbed = dubbed.has(c.id) || (prev?.dubbed === true && prev.voiceId === c.voiceId && prev.sha256 === createHash('sha256').update(buf).digest('hex'))
  clips[c.id] = {
    coachId: c.id,
    file: `coaches/${c.id}.mp4`,
    sha256: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.byteLength,
    line: prev?.line ?? '',
    generatedWith: prev?.generatedWith ?? 'vidiq:gemini-omni-flash (8s, 720p, 9:16)',
    voiceId: isDubbed ? c.voiceId : (prev?.voiceId ?? null),
    dubbed: isDubbed,
  }
}
const dubbingDone = process.argv.includes('--done') ? true : Boolean(previousDoc.dubbingDone)
writeFileSync(manifestPath, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), dubbingDone, note: previousDoc.note, clips }, null, 2) + '\n')
console.log(`manifest: ${Object.keys(clips).length} clips recorded`)
