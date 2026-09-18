import { useEffect, useRef } from 'react'
import type { Coach } from '../lib/types'
import { useCoachIntro } from './CoachIntro'

const SIZES = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
  hero: 'h-44 w-44',
}

/**
 * The coach's face: their intro clip, muted, shown as a circular portrait.
 * `playing` makes the clip loop (the coach "on camera"); otherwise the first
 * frame stands in as a photo. `speaking` adds the pulsing ring. Tapping it
 * opens their full-screen introduction with sound (`tappable`, default on).
 */
export function CoachFace({
  coach,
  size = 'md',
  playing = false,
  speaking = false,
  tappable = true,
  className = '',
}: {
  coach: Coach
  size?: keyof typeof SIZES
  playing?: boolean
  speaking?: boolean
  tappable?: boolean
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const { openIntro } = useCoachIntro()
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) v.play().catch(() => {})
    else {
      v.pause()
      v.currentTime = 0.3
    }
  }, [playing])

  const Wrapper = tappable ? 'button' : 'div'
  return (
    <Wrapper
      type={tappable ? 'button' : undefined}
      onClick={tappable ? () => openIntro(coach) : undefined}
      aria-label={tappable ? `Meet ${coach.name}` : undefined}
      className={`relative block shrink-0 rounded-full ${SIZES[size]} ${className}`}
    >
      {speaking && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
          <span className="absolute -inset-1 rounded-full ring-2 ring-accent/60" />
        </>
      )}
      <video
        ref={ref}
        src={`${import.meta.env.BASE_URL}${coach.video}`}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`${coach.name}, your coach`}
        className={`relative h-full w-full rounded-full object-cover shadow-card bg-gradient-to-br ${coach.gradient}`}
        onLoadedMetadata={(e) => {
          if (!playing) e.currentTarget.currentTime = 0.3
        }}
      />
    </Wrapper>
  )
}

/** Full-bleed portrait for the call screen: the coach on a video call with you */
export function CoachVideo({
  coach,
  playing,
  withSound = false,
  onEnded,
  className = '',
}: {
  coach: Coach
  playing: boolean
  withSound?: boolean
  onEnded?: () => void
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = !withSound
    if (playing) {
      if (withSound) v.currentTime = 0
      v.play().catch(() => {})
    } else v.pause()
  }, [playing, withSound])

  return (
    <video
      ref={ref}
      src={`${import.meta.env.BASE_URL}${coach.video}`}
      loop={!withSound}
      playsInline
      preload="auto"
      onEnded={onEnded}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}
