import type { Coach } from './types'
import versions from '../data/clipVersions.json'

/**
 * A coach's intro clip URL, versioned by the clip's content hash. Clips are served under fixed
 * names and cached for a day (Caddyfile), so without the query string a phone that had loaded the
 * old clip kept showing it after a swap. The versions file is written by scripts/intro-manifest.ts.
 */
export function clipUrl(coach: Pick<Coach, 'id' | 'video'>): string {
  const v = (versions as Record<string, string>)[coach.id]
  return `${import.meta.env.BASE_URL}${coach.video}${v ? `?v=${v}` : ''}`
}
