import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Coach } from '../lib/types'
import { usePhonePortrait } from '../lib/useViewport'

/**
 * Tap any coach and they introduce themselves — full screen, with sound.
 * One always-mounted <video> lives in the provider so play() runs inside the
 * tap's own call stack, which is what Safari requires for audio.
 */
interface IntroApi {
  openIntro: (coach: Coach, opts?: { onChoose?: () => void; chooseLabel?: string }) => void
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
  const [choose, setChoose] = useState<{ onChoose?: () => void; chooseLabel?: string }>({})
  const [ended, setEnded] = useState(false)
  const phone = usePhonePortrait()

  const openIntro = useCallback<IntroApi['openIntro']>((c, opts = {}) => {
    const v = video.current
    setCoach(c)
    setChoose(opts)
    setEnded(false)
    if (!v) return
    v.src = `${import.meta.env.BASE_URL}${c.video}`
    v.muted = false
    v.currentTime = 0
    v.play().catch(() => {
      // Sound blocked (no user activation yet) — play silently rather than not at all
      v.muted = true
      v.play().catch(() => {})
    })
  }, [])

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
          onClick={() => (ended ? replay() : video.current?.paused ? video.current.play() : video.current?.pause())}
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
              <div className="flex justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
                  {choose.onChoose && (
                    <button
                      onClick={() => {
                        choose.onChoose?.()
                        close()
                      }}
                      className="rounded-full bg-accent px-6 py-3 font-medium text-white"
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
