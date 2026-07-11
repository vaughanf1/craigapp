import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { uid, useStore } from '../../lib/store'
import { getCoach } from '../../data/coaches'
import { coachReply, dailyQuestion, greeting, speak, stopSpeaking } from '../../lib/coach'
import { aiErrorKind, askCoach } from '../../lib/ai'
import { CoachAvatar } from '../../components/ui'

export default function CoachChat() {
  const { state, addChat } = useStore()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const openedRef = useRef(false)

  // Coach opens the conversation
  useEffect(() => {
    if (openedRef.current || state.chat.length > 0) return
    openedRef.current = true
    const opener = `${greeting(profile.name)} I'm ${coach.name}, your coach. ${dailyQuestion(profile.areaId)}`
    addChat({ id: uid(), from: 'coach', text: opener, timestamp: Date.now() })
    if (profile.voiceEnabled) speak(opener, profile.accent, coach.gender)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.chat.length, typing])

  useEffect(() => stopSpeaking, [])

  const deliver = (reply: string) => {
    setTyping(false)
    addChat({ id: uid(), from: 'coach', text: reply, timestamp: Date.now() })
    if (profile.voiceEnabled) speak(reply, profile.accent, coach.gender)
  }

  const send = () => {
    const text = draft.trim()
    if (!text || typing) return
    setDraft('')
    const userMsg = { id: uid(), from: 'user' as const, text, timestamp: Date.now() }
    addChat(userMsg)
    setTyping(true)

    if (profile.aiEnabled && profile.aiApiKey) {
      askCoach(profile, coach, [...state.chat, userMsg], state.checkIns)
        .then(deliver)
        .catch((error) => {
          if (aiErrorKind(error) === 'auth') {
            deliver(
              `(Your AI key isn't working — check it in Settings. Meanwhile, I'm still here!) ${coachReply(profile, text)}`,
            )
          } else {
            deliver(coachReply(profile, text))
          }
        })
    } else {
      const reply = coachReply(profile, text)
      setTimeout(() => deliver(reply), 900 + Math.random() * 700)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <header className="flex items-center gap-3 pb-4">
        <CoachAvatar coach={coach} size="md" />
        <div>
          <h1 className="text-xl font-semibold">{coach.name}</h1>
          <p className="text-sm text-ink-secondary">
            {coach.style} · {profile.accent === 'british' ? '🇬🇧' : '🇺🇸'}{' '}
            {profile.voiceEnabled ? 'voice on' : 'voice off'}
          </p>
        </div>
      </header>

      <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto pb-4">
        {state.chat.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed ${
                m.from === 'user'
                  ? 'rounded-br-lg bg-accent text-white'
                  : 'rounded-bl-lg bg-white shadow-card hairline'
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-3xl rounded-bl-lg bg-white px-4 py-3 shadow-card hairline">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    className="h-2 w-2 rounded-full bg-ink-secondary/60"
                  />
                ))}
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={`Message ${coach.name}…`}
          className="min-w-0 flex-1 rounded-full bg-white px-5 py-3 text-[15px] shadow-card outline-none ring-accent/50 focus:ring-2"
        />
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={send}
          disabled={!draft.trim()}
          className="h-12 w-12 shrink-0 rounded-full bg-accent text-lg text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          aria-label="Send"
        >
          ↑
        </motion.button>
      </div>
    </div>
  )
}
