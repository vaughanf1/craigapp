import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Coach } from '../lib/types'
import { usePhonePortrait } from '../lib/useViewport'
import { clipUrl } from '../lib/clips'

/**
 * Tap any coach and they introduce themselves — full screen, with sound.
 * One always-mounted <video> lives in the provider so play() runs inside the
 * tap's own call stack, which is what Safari requires for audio.
 */
export interface IntroOptions {
  onChoose?: () => void
  chooseLabel?: string
  /** Start a live two-way call with this coach right now (only offered when the caller can — signed in, online) */
  onTalk?: () => void
}
interface IntroApi {
  openIntro: (coach: Coach, opts?: IntroOptions) => void
}
const Ctx = createContext<IntroApi | null>(null)

export function useCoachIntro(): IntroApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCoachIntro must be used within CoachIntroProvider')
  return ctx
}

export function CoachIntroProvider({ children }: { children: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null)
  const [coach, setCoach] = useState<Coach | null>(null)
  const [choose, setChoose] = useState<IntroOptions>({})
  const [ended, setEnded] = useState(false)
  /** The browser refused to start the clip with sound (no user activation reached play()) — offer a tap to unmute */
  const [soundBlocked, setSoundBlocked] = useState(false)
  const phone = usePhonePortrait()

  const openIntro = useCallback<IntroApi['openIntro']>((c, opts = {}) => {
    const v = video.current
    setCoach(c)
    setChoose(opts)
    setEnded(false)
    if (!v) return
    v.src = clipUrl(c)
    v.muted = false
    v.volume = 1
    v.currentTime = 0
    setSoundBlocked(false)
    v.play().catch(() => {
      // Sound blocked (no user activation yet) — play silently rather than not at all, and say so
      v.muted = true
      setSoundBlocked(true)
      v.play().catch(() => {})
    })
  }, [])

  /** Runs inside a tap, which is what Safari needs to allow audio */
  const unmute = () => {
    const v = video.current
    if (!v) return
    v.muted = false
    v.volume = 1
    v.currentTime = 0
    setSoundBlocked(false)
    setEnded(false)
    v.play().catch(() => setSoundBlocked(true))
  }

  const close = () => {
    video.current?.pause()
    setCoach(null)
  }

  const replay = () => {
    const v = video.current
    if (!v) return
    v.currentTime = 0
    v.muted = false
    setEnded(false)
    v.play().catch(() => {})
  }

  return (
    <Ctx.Provider value={{ openIntro }}>
      {children}
      {/* Always mounted: hidden until a coach is chosen, so play() can be called synchronously */}
      <div
        className={`fixed inset-0 z-[70] bg-black ${coach ? '' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!coach}
        role="dialog"
        aria-label={coach ? `${coach.name} introduces themselves` : undefined}
      >
        {/* Wide screens: the coach's blurred clip fills the gaps instead of cropping their face */}
        {!phone && coach && (
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-3xl"
            style={{ backgroundImage: `linear-gradient(135deg, #5e5ce6, #0a84ff)` }}
          />
        )}
        <video
          ref={video}
          playsInline
          preload="none"
          onEnded={() => setEnded(true)}
          onClick={() => (soundBlocked ? unmute() : ended ? replay() : video.current?.paused ? video.current.play() : video.current?.pause())}
          className={`relative h-full w-full ${phone ? 'object-cover' : 'object-contain'}`}
        />
        <AnimatePresence>
          {coach && (
            <motion.div
              key={coach.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
                {soundBlocked ? (
                  <button
                    onClick={unmute}
                    className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-float"
                  >
                    🔊 Tap for sound
                  </button>
                ) : <span />}
                <button
                  onClick={close}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className={`bg-gradient-to-t from-black/85 via-black/40 to-transparent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24 text-white ${phone ? '' : 'flex flex-col items-center text-center'}`}>
                <p className="text-3xl font-semibold tracking-tight">{coach.name}</p>
                <p className="text-white/70">
                  {coach.ageBand} · {coach.style}
                </p>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/85">{coach.bio}</p>
                <div className={`pointer-events-auto mt-5 flex flex-wrap gap-2 ${phone ? '' : 'justify-center'}`}>
                  {choose.onTalk && (
                    <button
                      onClick={() => {
                        const talk = choose.onTalk
                        close()
                        talk?.()
                      }}
                      className="rounded-full bg-accent px-6 py-3 font-medium text-white"
                    >
                      🎙 Talk to {coach.name} now
                    </button>
                  )}
                  {choose.onChoose && (
                    <button
                      onClick={() => {
                        choose.onChoose?.()
                        close()
                      }}
                      className={`rounded-full px-6 py-3 font-medium ${choose.onTalk ? 'bg-white/15 backdrop-blur' : 'bg-accent text-white'}`}
                    >
                      {choose.chooseLabel ?? `Choose ${coach.name}`}
                    </button>
                  )}
                  {ended && (
                    <button onClick={replay} className="rounded-full bg-white/15 px-6 py-3 font-medium backdrop-blur">
                      ▶ Play again
                    </button>
                  )}
                  <button onClick={close} className="rounded-full px-6 py-3 font-medium text-white/80">
                    {choose.onChoose ? 'Keep looking' : 'Done'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
