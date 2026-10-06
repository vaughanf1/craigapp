import type { Coach, VoiceAccent } from './types'
import { api } from './api'
import { speak as browserSpeak, speakAsync as browserSpeakAsync, stopSpeaking as browserStop } from './coach'

/**
 * The coach's voice in the app. Asks the server for the coach's real voice
 * (one voice per coach, cached and capped server-side); if the server says no
 * — no provider, cap hit, offline, error — falls back to the browser's own
 * speech so the coach is never silent. Same entry points as before, so call
 * sites don't care which path played.
 */

let current: HTMLAudioElement | null = null
let currentUrl: string | null = null

function stopAudio() {
  if (current) {
    current.pause()
    current.src = ''
    current = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

export function stopSpeaking() {
  stopAudio()
  browserStop()
}

function playBlob(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    stopAudio()
    const url = URL.createObjectURL(blob)
    const el = new Audio(url)
    current = el
    currentUrl = url
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      if (current === el) stopAudio()
      resolve(ok)
    }
    el.onended = () => finish(true)
    el.onerror = () => finish(false)
    el.play().catch(() => finish(false)) // autoplay blocked → caller falls back to browser speech
  })
}

/** Speak and resolve when finished. Server voice when available, browser speech otherwise. */
export async function speakAsync(text: string, coach: Coach, accent: VoiceAccent): Promise<void> {
  stopSpeaking()
  if (navigator.onLine && api.isSignedIn()) {
    const blob = await api.coach.speak(text).catch(() => null)
    if (blob && (await playBlob(blob))) return
  }
  return browserSpeakAsync(text, accent, coach.gender)
}

/** Fire-and-forget version for chat bubbles and previews */
export function speak(text: string, coach: Coach, accent: VoiceAccent) {
  void speakAsync(text, coach, accent).catch(() => browserSpeak(text, accent, coach.gender))
}
