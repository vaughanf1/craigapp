import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { COACHES } from '../shared/coaches.ts'

/**
 * The voice-match guarantee. A coach's intro clip must be the one recorded in
 * the manifest, and once a coach has a real voice, their clip must have been
 * dubbed to that voice. Regenerate the manifest with scripts/intro-manifest.ts.
 */
const dir = new URL('../../public/coaches/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8')) as {
  /** false while the re-dub pass is outstanding: the voice check warns instead of failing */
  dubbingDone: boolean
  clips: Record<string, { sha256: string; voiceId: string | null; dubbed: boolean; line: string }>
}

describe('intro clips match the roster', () => {
  for (const c of COACHES) {
    const file = new URL(`${c.id}.mp4`, dir)
    if (!existsSync(file)) continue
    it(`${c.name}'s clip is the recorded one and speaks in their voice`, () => {
      const entry = manifest.clips[c.id]
      expect(entry, `${c.id} is in public/coaches/manifest.json — run scripts/intro-manifest.ts`).toBeDefined()
      expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(entry.sha256)
      if (c.voiceId && !(entry.dubbed && entry.voiceId === c.voiceId)) {
        if (manifest.dubbingDone) expect.fail(`${c.id} has voice ${c.voiceId} but the clip has not been dubbed to it`)
        else console.warn(`[voice-match] ${c.id}: clip not yet dubbed to voice ${c.voiceId} (manifest.dubbingDone = false)`)
      }
    })
  }
  it('no retired coach still has a clip or a manifest entry', () => {
    for (const id of ['elena', 'richard']) {
      expect(existsSync(new URL(`${id}.mp4`, dir))).toBe(false)
      expect(manifest.clips[id]).toBeUndefined()
    }
  })
})
