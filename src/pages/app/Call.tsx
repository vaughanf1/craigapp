import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { uid, useStore, currentStreak } from '../../lib/store'
import { getCoach } from '../../data/coaches'
import { api } from '../../lib/api'
import { coachReply, greeting, morningKickoff, streakPraise } from '../../lib/coach'
import { speakAsync, stopSpeaking } from '../../lib/voice'
import { getSpeechRecognition, listenOnce } from '../../lib/speech'
import { CoachFace, CoachVideo } from '../../components/CoachFace'

type Stage = 'ringing' | 'connecting' | 'live' | 'ended' | 'missed'
type Turn = { id: string; from: 'coach' | 'user'; text: string }

/**
 * The call. Your coach rings you — from a push notification, the schedule,
 * or "Call me now" — and you talk.
 *
 * Two engines:
 *  - LIVE (default when the server has an ElevenLabs agent): a real two-way
 *    voice conversation over WebRTC in the coach's own voice. Always listening,
 *    interrupt whenever you like, no buttons to press. The server supplies the
 *    persona, today's context and the opening brief per call.
 *  - FALLBACK (offline, no agent, mic refused): speak the brief, listen once,
 *    answer through the coach brain, repeat.
 * Everything said either way goes into memory.
 */
export default function Call() {
  return (
    <ConversationProvider>
      <CallScreen />
    </ConversationProvider>
  )
}

function CallScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, online, addChat } = useStore()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)

  const [stage, setStage] = useState<Stage>('ringing')
  const [brief, setBrief] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [limits, setLimits] = useState({ maxSeconds: 240, wrapUpSeconds: 150, maxTurns: 6 })
  /** true once the live engine is carrying the call; false means the fallback loop is */
  const [isLive, setIsLive] = useState(false)
  const userTurns = useRef(0)
  const startedAt = useRef<number | null>(null)
  const mutedRef = useRef(false)
  const stopListenRef = useRef<() => void>(() => {})
  const loadedRef = useRef(false)
  const briefRef = useRef<string | null>(null)
  const liveStarting = useRef<{ resolve: (ok: boolean) => void } | null>(null)
  const endedRef = useRef(false)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const canListen = Boolean(getSpeechRecognition())

  /* ---------- live engine ---------- */
  const live = useConversation({
    onConnect: () => {
      liveStarting.current?.resolve(true)
      liveStarting.current = null
    },
    onError: (message) => {
      // Before we're connected an error means "use the fallback"; mid-call we show it and carry on
      if (liveStarting.current) {
        liveStarting.current.resolve(false)
        liveStarting.current = null
      } else setError(message)
    },
    onDisconnect: () => {
      if (liveStarting.current) {
        liveStarting.current.resolve(false)
        liveStarting.current = null
        return
      }
      // The agent hung up (natural goodbye or the time cap) — close the call screen gracefully
      if (!endedRef.current) finish()
    },
    onModeChange: ({ mode }) => {
      setSpeaking(mode === 'speaking')
      setListening(mode === 'listening')
    },
    onMessage: ({ message, source }) => {
      const text = (message ?? '').trim()
      if (!text) return
      const from: Turn['from'] = source === 'user' ? 'user' : 'coach'
      setTurns((t) => [...t, { id: uid(), from, text }])
      addChat({ id: uid(), from, text, timestamp: Date.now() })
      // The opening brief is already stored by the delivery; everything after it is new
      if (from === 'coach' && briefRef.current && text === briefRef.current.trim()) return
      if (online) api.coach.liveTurn(from, text).catch(() => {})
    },
  })

  /* Fetch the brief while it rings; if the server can't produce one, build it locally so the call still happens */
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const localBrief = () => {
      const streak = currentStreak(state.checkIns)
      return `${greeting(profile.name)} It's ${coach.name}. ${streak > 1 ? streakPraise(profile.name, streak, profile.areaId) + ' ' : ''}${morningKickoff(profile.areaId)}`
    }
    const load = async () => {
      if (!online) return setBrief(localBrief())
      try {
        const d = id ? await api.coach.delivery(id) : await api.coach.callNow([])
        setBrief(d.brief)
        if (!id) navigate(`/app/call/${d.id}`, { replace: true })
      } catch {
        setError(`${coach.name} couldn't prepare your brief just now — this one's from memory.`)
        setBrief(localBrief())
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  useEffect(() => {
    briefRef.current = brief
  }, [brief])

  /* Ringtone: a soft two-tone from the Web Audio API — no asset needed */
  useEffect(() => {
    if (stage !== 'ringing') return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    let stopped = false
    const ring = () => {
      if (stopped) return
      for (const [f, t] of [[880, 0], [1046, 0.35]] as const) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = f
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + t + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3)
        o.connect(g).connect(ctx.destination)
        o.start(ctx.currentTime + t)
        o.stop(ctx.currentTime + t + 0.32)
      }
    }
    ring()
    const iv = setInterval(ring, 2200)
    if ('vibrate' in navigator) navigator.vibrate?.([300, 200, 300])
    return () => {
      stopped = true
      clearInterval(iv)
      ctx.close().catch(() => {})
    }
  }, [stage])

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, thinking])

  useEffect(() => {
    if (online) api.coach.callLimits().then(setLimits).catch(() => {})
  }, [online])

  /* Call clock. The fallback loop enforces maxSeconds here; the live agent has its own cap server-side */
  useEffect(() => {
    if (stage !== 'live') return
    startedAt.current = Date.now()
    const iv = setInterval(() => {
      const secs = Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)
      setElapsed(secs)
      if (!isLive && secs >= limits.maxSeconds) endCall()
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, limits.maxSeconds, isLive])

  useEffect(
    () => () => {
      stopSpeaking()
      stopListenRef.current()
      try { live.endSession() } catch { /* not started */ }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /* ---------- fallback engine ---------- */
  const say = useCallback(
    async (text: string) => {
      setTurns((t) => [...t, { id: uid(), from: 'coach', text }])
      addChat({ id: uid(), from: 'coach', text, timestamp: Date.now() })
      if (mutedRef.current) return
      setSpeaking(true)
      await speakAsync(text, coach, profile.accent)
      setSpeaking(false)
    },
    [addChat, profile.accent, coach],
  )

  const listen = useCallback(async () => {
    if (!canListen) return
    setListening(true)
    const { promise, stop } = listenOnce(profile.accent === 'british' ? 'en-GB' : 'en-US')
    stopListenRef.current = stop
    const heard = await promise
    setListening(false)
    if (heard) await respond(heard)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canListen, profile.accent])

  const respond = async (text: string) => {
    setTurns((t) => [...t, { id: uid(), from: 'user', text }])
    addChat({ id: uid(), from: 'user', text, timestamp: Date.now() })
    setThinking(true)
    userTurns.current += 1
    const secs = (Date.now() - (startedAt.current ?? Date.now())) / 1000
    const wrapUp = secs >= limits.wrapUpSeconds || userTurns.current >= limits.maxTurns - 1
    let reply: string
    try {
      reply = online ? (await api.coach.message(text, 'call', wrapUp ? 'wrap-up' : undefined)).reply : coachReply(profile, text)
    } catch {
      reply = coachReply(profile, text) // server unreachable — the built-in coach keeps the call going
    }
    setThinking(false)
    await say(reply)
    if (/\bgoodbye\b/i.test(reply) || userTurns.current >= limits.maxTurns) return endCall()
    listen()
  }

  /* ---------- answering ---------- */
  /** Try the live engine: mic permission → server token + overrides → WebRTC session. False means use the fallback. */
  const startLive = async (): Promise<boolean> => {
    if (!online) return false
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return false
    }
    let session
    try {
      session = await api.coach.liveCall(id)
    } catch {
      return false // 503: not configured, or ElevenLabs down
    }
    return new Promise<boolean>((resolve) => {
      liveStarting.current = { resolve }
      const timer = setTimeout(() => {
        if (liveStarting.current) {
          liveStarting.current = null
          resolve(false)
        }
      }, 12_000)
      const done = (ok: boolean) => {
        clearTimeout(timer)
        resolve(ok)
      }
      liveStarting.current = { resolve: done }
      try {
        live.startSession({ conversationToken: session.token, connectionType: 'webrtc', overrides: session.overrides })
      } catch {
        liveStarting.current = null
        done(false)
      }
    })
  }

  const accept = async () => {
    setStage('connecting')
    if (online && id) api.coach.answer(id).catch(() => {})
    const ok = await startLive()
    if (ok) {
      setIsLive(true)
      setStage('live')
      return
    }
    // Fallback: the coach speaks the brief, then listens once per turn
    await new Promise((r) => setTimeout(r, 300))
    setStage('live')
    const text = brief ?? `${greeting(profile.name)} It's ${coach.name}. How's today going?`
    await say(text)
    listen()
  }

  const decline = () => {
    if (online && id) api.coach.missed(id).catch(() => {})
    setStage('missed')
    setTimeout(() => navigate('/app'), 1200)
  }

  /** The call is over, whoever ended it */
  const finish = () => {
    if (endedRef.current) return
    endedRef.current = true
    stopSpeaking()
    stopListenRef.current()
    setSpeaking(false)
    setListening(false)
    setStage('ended')
    if (online) api.coach.refreshMemory().catch(() => {})
  }

  const endCall = () => {
    if (isLive) {
      try { live.endSession() } catch { /* already closed */ }
    }
    finish()
  }

  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (isLive) live.setMuted(next)
    else if (next) stopSpeaking()
  }

  const sendDraft = () => {
    const t = draft.trim()
    if (!t || thinking) return
    setDraft('')
    if (isLive) {
      // Typed into a live call: show it, store it, hand it to the agent
      setTurns((x) => [...x, { id: uid(), from: 'user', text: t }])
      addChat({ id: uid(), from: 'user', text: t, timestamp: Date.now() })
      if (online) api.coach.liveTurn('user', t).catch(() => {})
      live.sendUserMessage(t)
      return
    }
    stopListenRef.current()
    stopSpeaking() // typing over the coach is allowed — it's a conversation
    setSpeaking(false)
    respond(t)
  }

  const isDark = stage !== 'ended'
  const statusLine = isLive
    ? speaking ? 'Speaking — jump in any time' : 'Listening…'
    : speaking ? 'Speaking…' : listening ? 'Listening…' : thinking ? 'Thinking…' : elapsed >= limits.wrapUpSeconds ? 'Wrapping up' : 'On the call'

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${isDark ? 'bg-[#0b0b0f] text-white' : 'bg-fog text-ink'}`}>
      {/* The coach on camera */}
      {isDark && (
        <div className="absolute inset-0">
          <CoachVideo coach={coach} playing={stage === 'live' || stage === 'connecting'} className={stage === 'live' ? 'opacity-100' : 'opacity-40 blur-2xl scale-110'} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {(stage === 'ringing' || stage === 'connecting' || stage === 'missed') && (
          <motion.div
            key="ringing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-1 flex-col items-center justify-between px-8 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(5rem,env(safe-area-inset-top))]"
          >
            <div className="flex flex-col items-center text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Be More · coach call</p>
              <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="mt-8">
                <CoachFace coach={coach} size="hero" playing speaking={stage === 'ringing'} tappable={false} className="ring-4 ring-white/20" />
              </motion.div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight">{coach.name}</h1>
              <p className="mt-1 text-lg text-white/70">
                {stage === 'connecting' ? 'Connecting…' : stage === 'missed' ? 'Call declined' : 'Incoming call'}
              </p>
              {stage === 'connecting' && online && (
                <p className="mt-2 text-sm text-white/50">Allow the microphone so you can talk back.</p>
              )}
              {error && <p className="mt-4 max-w-xs text-sm text-white/60">{error}</p>}
            </div>

            {stage === 'ringing' && (
              <div className="flex w-full max-w-xs items-center justify-between">
                <CallButton label="Decline" color="bg-[#ff3b30]" onClick={decline} icon="✕" />
                <CallButton label="Accept" color="bg-[#34c759]" onClick={accept} icon="✓" pulse disabled={!brief} />
              </div>
            )}
          </motion.div>
        )}

        {stage === 'live' && (
          <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex flex-1 flex-col">
            <header className="flex items-center justify-between px-6 pt-[max(3rem,env(safe-area-inset-top))]">
              <div>
                <p className="text-xl font-semibold">{coach.name}</p>
                <p className="text-sm text-white/70">
                  <span className="tabular-nums">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
                  {' · '}
                  {statusLine}
                </p>
              </div>
              <button
                onClick={toggleMute}
                aria-pressed={muted}
                className={`rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur ${muted ? 'bg-white/20' : 'bg-white/10'}`}
              >
                {isLive ? (muted ? 'Mic off' : 'Mic on') : muted ? 'Sound off' : 'Sound on'}
              </button>
            </header>

            {/* Live: a listening ring around the coach while they wait for you */}
            {isLive && (
              <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
                <AnimatePresence>
                  {listening && !speaking && (
                    <motion.span
                      key="ear"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-full bg-black/40 px-4 py-2 text-sm text-white/85 backdrop-blur"
                    >
                      🎙 Your turn — just talk
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Captions / transcript */}
            <div ref={transcriptRef} className="no-scrollbar mt-auto max-h-[44vh] space-y-2 overflow-y-auto px-5 pb-3">
              {turns.slice(-6).map((t) => (
                <motion.p
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed backdrop-blur ${
                    t.from === 'coach' ? 'bg-black/45' : 'ml-auto bg-accent/80'
                  }`}
                >
                  {t.text}
                </motion.p>
              ))}
              {thinking && (
                <p className="max-w-[88%] rounded-2xl bg-black/45 px-4 py-2.5 text-[15px] text-white/60 backdrop-blur">…</p>
              )}
            </div>

            <div className="space-y-3 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (isLive) live.sendUserActivity() // typing: ask the coach to hold on a moment
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && sendDraft()}
                  placeholder={isLive || canListen ? 'Or type…' : `Reply to ${coach.name}…`}
                  className="min-w-0 flex-1 rounded-full bg-white/15 px-5 py-3 text-[15px] text-white placeholder-white/50 outline-none backdrop-blur focus:bg-white/20"
                />
                <button onClick={sendDraft} disabled={!draft.trim()} className="h-12 w-12 rounded-full bg-white/20 text-lg backdrop-blur disabled:opacity-40" aria-label="Send">
                  ↑
                </button>
              </div>
              <div className="flex items-center justify-center gap-8">
                {!isLive && canListen && (
                  <CallButton
                    label={listening ? 'Listening' : 'Speak'}
                    color={listening ? 'bg-accent' : 'bg-white/15'}
                    icon="🎙"
                    pulse={listening}
                    disabled={thinking}
                    onClick={() => {
                      if (listening) return stopListenRef.current()
                      stopSpeaking()
                      setSpeaking(false)
                      listen()
                    }}
                  />
                )}
                <CallButton label="End" color="bg-[#ff3b30]" icon="✕" onClick={endCall} />
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'ended' && (
          <motion.div key="ended" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
            <CoachFace coach={coach} size="xl" tappable={false} />
            <h1 className="mt-6 text-2xl font-semibold">Call ended</h1>
            <p className="mt-2 max-w-xs text-ink-secondary">
              {online
                ? `${coach.name} is adding what you said to memory — it'll shape the next call.`
                : `Sign in to a Be More account and ${coach.name} will remember every call.`}
            </p>
            <button onClick={() => navigate('/app')} className="mt-8 rounded-full bg-accent px-7 py-3 font-medium text-white">
              Back to today
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CallButton({
  label,
  color,
  icon,
  onClick,
  pulse = false,
  disabled = false,
}: {
  label: string
  color: string
  icon: string
  onClick: () => void
  pulse?: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        animate={pulse ? { scale: [1, 1.08, 1] } : {}}
        transition={pulse ? { repeat: Infinity, duration: 1.2 } : {}}
        onClick={onClick}
        disabled={disabled}
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl text-white shadow-float backdrop-blur disabled:opacity-40 ${color}`}
        aria-label={label}
      >
        {icon}
      </motion.button>
      <span className="text-sm text-white/80">{label}</span>
    </div>
  )
}
