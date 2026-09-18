/** Speech recognition — vendor-prefixed in most browsers, absent in some. */
export interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } }; length: number } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Listen once and resolve with what was heard ('' on silence/error) */
export function listenOnce(lang = 'en-GB'): { promise: Promise<string>; stop: () => void } {
  const Ctor = getSpeechRecognition()
  if (!Ctor) return { promise: Promise.resolve(''), stop: () => {} }
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.continuous = false
  let heard = ''
  const promise = new Promise<string>((resolve) => {
    rec.onresult = (e) => {
      heard = e.results[0][0].transcript
    }
    rec.onend = () => resolve(heard.trim())
    rec.onerror = () => resolve('')
    try {
      rec.start()
    } catch {
      resolve('')
    }
  })
  return { promise, stop: () => rec.stop() }
}
