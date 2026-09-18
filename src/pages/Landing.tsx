import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GOAL_AREAS } from '../data/goalAreas'
import { COACHES } from '../data/coaches'
import { CoachAvatar, Disclaimer, Rise } from '../components/ui'
import Logo from '../components/Logo'

const BENEFITS = [
  { icon: '😊', title: 'Happiness', text: 'Feel better about who you are and where you’re going.' },
  { icon: '🧘', title: 'Less stress', text: 'Built-in calm — breathing, mindfulness and de-stress tools.' },
  { icon: '❤️', title: 'Better relationships', text: 'Show up as a better parent, partner and friend.' },
  { icon: '🏆', title: 'More success', text: 'In business, in fitness, in life — momentum that compounds.' },
  { icon: '🎯', title: 'Achieve more goals', text: 'A proven 7-step framework that turns wishes into plans.' },
  { icon: '📈', title: 'Be more', text: 'Be more. Do more. Have more. Every single day.' },
]

const HOW = [
  {
    step: '01',
    title: 'Pick your coach',
    text: 'A real face, not a chatbot. Choose who you want in your corner — a woman or a man, from their 20s to their 50s — and meet them on camera before you decide.',
  },
  {
    step: '02',
    title: 'It works backwards from your goal',
    text: 'Give it the goal and the date. Your coach reverse-engineers it into dated stops, weekly commitments and daily actions — by the inch it’s a cinch — and tracks you against them.',
  },
  {
    step: '03',
    title: 'Your phone rings',
    text: 'A real call, morning and evening — not a notification. Yesterday in numbers, today’s one thing, and in the evening: what got done. You talk, your coach listens and answers.',
  },
  {
    step: '04',
    title: 'It remembers',
    text: 'Every call, chat and check-in builds your coach’s memory of you — the wedding you’re slimming for, the weekend that always derails you. The longer you stay, the better it knows you.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-fog">
      {/* Nav */}
      <header className="glass sticky top-0 z-50 border-b border-black/5">
        <nav className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Logo className="h-6 w-6" />
            Be More
          </div>
          <div className="hidden items-center gap-8 text-sm text-ink-secondary sm:flex">
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#coaches" className="transition-colors hover:text-ink">Coaches</a>
            <a href="#areas" className="transition-colors hover:text-ink">Life areas</a>
          </div>
          <Link
            to="/start"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center sm:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo/20 via-sky/15 to-mint/20 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">
            Accountability, not notifications
          </p>
          <h1 className="display-tight mx-auto max-w-3xl text-5xl font-semibold sm:text-7xl">
            A coach who
            <br />
            <span className="bg-gradient-to-r from-indigo via-sky to-mint bg-clip-text text-transparent">
              actually rings you.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-secondary sm:text-xl">
            Every morning and every evening, your phone rings. It’s your coach — with yesterday’s
            numbers, today’s one thing, and a plan they worked out backwards from your goal.
            Not another app you swipe away.
          </p>
          <div className="mt-9 flex items-center justify-center gap-4">
            <Link
              to="/start"
              className="rounded-full bg-accent px-8 py-3.5 text-[17px] font-medium text-white shadow-float transition-all hover:bg-accent-hover active:scale-[0.97]"
            >
              Start free
            </Link>
            <a
              href="#how"
              className="rounded-full px-6 py-3.5 text-[17px] font-medium text-accent transition-colors hover:underline"
            >
              Learn more ›
            </a>
          </div>
        </motion.div>

        {/* Incoming call mock */}
        <Rise delay={0.25} className="mx-auto mt-16 max-w-xs">
          <div className="rounded-4xl bg-[#0b0b0f] p-6 text-center text-white shadow-float">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Be More · coach call</p>
            <div className="mx-auto mt-5 w-fit">
              <CoachAvatar coach={COACHES[6]} size="xl" className="ring-4 ring-white/15" />
            </div>
            <p className="mt-4 text-2xl font-semibold">Margaret</p>
            <p className="text-white/60">Incoming call · 9:00</p>
            <p className="mx-auto mt-5 max-w-[240px] rounded-2xl bg-white/10 px-4 py-2.5 text-left text-sm leading-relaxed">
              “Morning Craig. 1,650 yesterday against 1,800 — cooking on gas. Today: one slice at
              the office, not three. What time’s lunch?”
            </p>
            <div className="mt-6 flex justify-center gap-10">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff3b30] text-xl">✕</span>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#34c759] text-xl">✓</span>
            </div>
          </div>
        </Rise>

        {/* A day with Be More */}
        <Rise delay={0.35} className="mx-auto mt-16 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
          {[
            ['09:00', 'The morning call', 'Yesterday in real numbers. Where you stand against the plan. The one thing for today.'],
            ['During the day', 'Tick, log, talk', 'Tick off the daily actions. Log food by voice. Message your coach when it wobbles.'],
            ['19:00', 'The evening review', 'What got done, what didn’t — said out loud. Tomorrow’s focus, set. It all goes into memory.'],
          ].map(([time, title, text]) => (
            <div key={time} className="rounded-3xl bg-white p-5 shadow-card hairline">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{time}</p>
              <p className="mt-1 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{text}</p>
            </div>
          ))}
        </Rise>
      </section>

      {/* Zig Ziglar quote */}
      <section className="bg-ink px-6 py-24 text-center text-white">
        <Rise>
          <blockquote className="mx-auto max-w-3xl text-2xl font-medium leading-snug sm:text-4xl display-tight">
            “You can change who you are, and where you are, by changing what goes into your mind.”
          </blockquote>
          <p className="mt-6 text-sm uppercase tracking-widest text-white/50">— Zig Ziglar</p>
          <p className="mx-auto mt-8 max-w-xl text-white/70">
            Your mind is like a computer: garbage in, garbage out. Change the input and you
            dramatically improve the output. Be More puts the right input in — every single day.
          </p>
        </Rise>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <Rise>
          <h2 className="display-tight text-center text-4xl font-semibold sm:text-5xl">
            It comes with a lot of benefits.
          </h2>
        </Rise>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Rise key={b.title} delay={i * 0.06}>
              <div className="h-full rounded-3xl bg-white p-7 shadow-card hairline">
                <div className="text-4xl">{b.icon}</div>
                <h3 className="mt-4 text-xl font-semibold">{b.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-secondary">{b.text}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Rise>
            <h2 className="display-tight text-center text-4xl font-semibold sm:text-5xl">
              How it works.
            </h2>
          </Rise>
          <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {HOW.map((h, i) => (
              <Rise key={h.step} delay={i * 0.1}>
                <p className="bg-gradient-to-r from-indigo to-sky bg-clip-text text-5xl font-bold text-transparent">
                  {h.step}
                </p>
                <h3 className="mt-4 text-xl font-semibold">{h.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-secondary">{h.text}</p>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      {/* Coaches */}
      <section id="coaches" className="mx-auto max-w-5xl px-6 py-24">
        <Rise>
          <h2 className="display-tight text-center text-4xl font-semibold sm:text-5xl">
            Pick your coach.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-ink-secondary">
            Eight coaches. British or American voice. Encouraging, uplifting — and always bringing
            you back on track.
          </p>
        </Rise>
        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {COACHES.map((c, i) => (
            <Rise key={c.id} delay={i * 0.05}>
              <div className="flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-card hairline">
                <CoachAvatar coach={c} size="lg" />
                <p className="mt-4 font-semibold">{c.name}</p>
                <p className="text-sm text-ink-secondary">{c.ageBand} · {c.style}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* Life areas */}
      <section id="areas" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Rise>
            <h2 className="display-tight text-center text-4xl font-semibold sm:text-5xl">
              Whatever you want to be more of.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-ink-secondary">
              Ten areas of life. One goal at a time. Balanced growth across all of them.
            </p>
          </Rise>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {GOAL_AREAS.map((a, i) => (
              <Rise key={a.id} delay={i * 0.04}>
                <div className="flex items-center gap-4 rounded-3xl bg-fog p-5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-2xl shadow-card`}
                  >
                    {a.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-sm text-ink-secondary">{a.tagline}</p>
                  </div>
                </div>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-28 text-center">
        <Rise>
          <h2 className="display-tight text-4xl font-semibold sm:text-6xl">
            Be more. Do more.
            <br />
            <span className="bg-gradient-to-r from-indigo via-sky to-mint bg-clip-text text-transparent">
              Have more.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-ink-secondary">
            Your coach is ready. All that’s missing is you.
          </p>
          <Link
            to="/start"
            className="mt-9 inline-block rounded-full bg-accent px-9 py-4 text-lg font-medium text-white shadow-float transition-all hover:bg-accent-hover active:scale-[0.97]"
          >
            Get started free
          </Link>
        </Rise>
      </section>

      <footer className="border-t border-black/5 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 font-semibold">
            <Logo className="h-5 w-5" />
            Be More
          </div>
          <Disclaimer className="mt-4 max-w-2xl" />
          <div className="mt-4 flex gap-5 text-xs">
            <Link to="/privacy" className="text-accent">Privacy Policy</Link>
            <Link to="/terms" className="text-accent">Terms & Disclaimer</Link>
          </div>
          <p className="mt-3 text-xs text-ink-secondary">
            © {new Date().getFullYear()} Be More. Available on the web — App Store & Google Play coming soon.
          </p>
        </div>
      </footer>
    </div>
  )
}
