import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COACHES, getCoach } from '../shared/coaches.ts'
import { VOICE_GUIDES, getVoiceGuide } from '../shared/voices/index.ts'
import { validateVoiceGuide, voiceBlock } from '../src/coach/voice.ts'
import { personaBlock } from '../src/coach/prompt.ts'
import { sharedRules } from '../src/coach/rules.ts'

const dir = join(import.meta.dirname, '../shared/voices')
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

describe('voice guides', () => {
  it('every JSON file in the folder is a valid guide and is registered', () => {
    for (const f of files) {
      const raw = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      const guide = validateVoiceGuide(raw)
      expect(guide.coachId, `${f} coachId matches its filename`).toBe(f.replace('.json', ''))
      expect(VOICE_GUIDES[guide.coachId], `${f} is imported in voices/index.ts`).toBeDefined()
    }
    expect(Object.keys(VOICE_GUIDES).sort()).toEqual(files.map((f) => f.replace('.json', '')).sort())
  })

  it('every guide belongs to a coach on the roster, and agrees with the roster on methodology', () => {
    for (const g of Object.values(VOICE_GUIDES)) {
      const coach = COACHES.find((c) => c.id === g.coachId)
      expect(coach, `${g.coachId} is on the roster`).toBeDefined()
      expect(coach!.methodology, `${g.coachId} methodology in coaches.ts`).toBe(g.methodology)
    }
  })

  it('no two coaches use the same methodology', () => {
    const used = Object.values(VOICE_GUIDES).map((g) => g.methodology)
    expect(new Set(used).size).toBe(used.length)
  })

  it('no two coaches share a catchphrase, example line or vocabulary item', () => {
    const seen = new Map<string, string>()
    for (const g of Object.values(VOICE_GUIDES)) {
      for (const phrase of [...g.catchphrases, ...g.examples, ...g.vocabulary]) {
        const key = phrase.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
        const owner = seen.get(key)
        expect(owner === undefined || owner === g.coachId, `"${phrase}" is used by both ${owner} and ${g.coachId}`).toBe(true)
        seen.set(key, g.coachId)
      }
    }
  })

  it('a coach never uses a phrase from its own banned list in its examples or catchphrases', () => {
    for (const g of Object.values(VOICE_GUIDES)) {
      const said = [...g.catchphrases, ...g.examples, ...Object.values(g.moments).map((m) => m.example)].join('\n').toLowerCase()
      for (const b of g.banned) {
        expect(said.includes(b.toLowerCase()), `${g.coachId} says banned phrase "${b}"`).toBe(false)
      }
    }
  })

  it('no coach refuses, shames or dismisses in anything they are scripted to say', () => {
    const harsh = ['denied', 'not interested in the story', 'stop explaining', "your feelings aren't", 'no excuses', 'pity is a chair', "don't celebrate", "i'm not buying"]
    for (const g of Object.values(VOICE_GUIDES)) {
      const said = [...g.catchphrases, ...g.examples, ...Object.values(g.moments).map((m) => m.example)].join('\n').toLowerCase()
      for (const h of harsh) {
        expect(said.includes(h), `${g.coachId} is scripted to say "${h}"`).toBe(false)
      }
    }
  })

  it('rejects a guide that breaks the spec', () => {
    const good = getVoiceGuide('maya')!
    expect(() => validateVoiceGuide({ ...good, vocabulary: good.vocabulary.slice(0, 5) })).toThrow()
    expect(() => validateVoiceGuide({ ...good, catchphrases: [] })).toThrow()
    expect(() => validateVoiceGuide({ ...good, methodology: 'shouty' })).toThrow()
    expect(() => validateVoiceGuide({ ...good, moments: { ...good.moments, struggling: undefined } })).toThrow()
  })
})

describe('prompt architecture', () => {
  it('composes identity, voice and shared rules for a coach with a guide', () => {
    const p = personaBlock('maya')
    expect(p).toContain('You are Maya')
    expect(p).toContain('YOUR VOICE')
    expect(p).toContain('Small win, big noise.')
    expect(p).toContain('NOT A YES-MAN')
    expect(p).toContain('VISION → OUTCOME → MILESTONES')
    expect(p).toContain('Samaritans on 116 123')
    // identity → voice → rules, in that order
    expect(p.indexOf('YOUR VOICE')).toBeGreaterThan(p.indexOf('You are Maya'))
    expect(p.indexOf('NOT A YES-MAN')).toBeGreaterThan(p.indexOf('YOUR VOICE'))
  })

  it('two coaches share the rules word for word but nothing of the voice', () => {
    const rules = sharedRules('X').replace('X', '')
    const a = personaBlock('maya')
    const b = personaBlock('sophia')
    expect(a).toContain(rules.split('\n')[2])
    expect(b).toContain(rules.split('\n')[2])
    const va = voiceBlock('maya').split('\n').filter((l) => l.startsWith('- "'))
    const vb = voiceBlock('sophia').split('\n').filter((l) => l.startsWith('- "'))
    expect(va.length).toBeGreaterThan(0)
    expect(va.filter((l) => vb.includes(l))).toEqual([])
  })

  it('falls back to style and bio for a coach without a guide yet', () => {
    const p = personaBlock('richard')
    expect(voiceBlock('richard')).toBe('')
    expect(p).toContain(`Your personality: ${getCoach('richard').style}`)
    expect(p).toContain('NOT A YES-MAN')
  })

  it('no real-person attribution survives in the shared rules', () => {
    expect(sharedRules('Maya')).not.toMatch(/Ziglar/i)
  })
})
