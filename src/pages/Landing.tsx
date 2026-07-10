import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GOAL_AREAS } from '../data/goalAreas'
import { COACHES } from '../data/coaches'
import { CoachAvatar, Disclaimer, Rise } from '../components/ui'

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
    text: 'Choose from eight AI coaches — male or female, from their 20s to their 50s — with a British or American voice. Like a gym buddy who never misses a session.',
  },
  {
    step: '02',
    title: 'Set your goal',
    text: 'Choose a life area, then work through the 7-step framework: your goal, what’s in it for you, your supporters, obstacles, skills, action plan and target date.',
  },
  {
    step: '03',
    title: 'Check in daily',
    text: 'Your coach talks to you up to five times a day — asking how it’s going, celebrating streaks, and bringing you back on track after a bad day. Encouraging, uplifting, realistic.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-fog">
      {/* Nav */}
      <header className="glass sticky top-0 z-50 border-b border-black/5">
        <nav className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/bemore.svg" alt="" className="h-6 w-6 rounded-md" />
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
            Your personal AI coach
          </p>
          <h1 className="display-tight mx-auto max-w-3xl text-5xl font-semibold sm:text-7xl">
            Be the best person
            <br />
            <span className="bg-gradient-to-r from-indigo via-sky to-mint bg-clip-text text-transparent">
              you can be.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-secondary sm:text-xl">
            Be More is the AI gym buddy for your whole life. A coach who talks to you every day —
            motivating you, encouraging you, and keeping you on track towards whatever goal you’re
            chasing.
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

        {/* Floating coach preview card */}
        <Rise delay={0.25} className="mx-auto mt-16 max-w-sm">
          <div className="rounded-4xl bg-white p-6 text-left shadow-float hairline">
            <div className="flex items-center gap-4">
              <CoachAvatar coach={COACHES[4]} size="md" />
              <div>
                <p className="font-semibold">Elena</p>
                <p className="text-sm text-ink-secondary">Your coach · 9:02 AM</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="w-fit max-w-[85%] rounded-3xl rounded-tl-lg bg-fog px-4 py-2.5 text-[15px]">
                Morning, Craig! That’s 4 days in a row — you’re doing brilliantly. 🎉
              </div>
              <div className="w-fit max-w-[85%] rounded-3xl rounded-tl-lg bg-fog px-4 py-2.5 text-[15px]">
                Let’s make it happen today. How did you get on with your goal yesterday?
              </div>
            </div>
          </div>
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
          <div className="mt-14 grid gap-10 md:grid-cols-3">
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
            <img src="/bemore.svg" alt="" className="h-5 w-5 rounded" />
            Be More
          </div>
          <Disclaimer className="mt-4 max-w-2xl" />
          <p className="mt-4 text-xs text-ink-secondary">
            © {new Date().getFullYear()} Be More. Available on the web — App Store & Google Play coming soon.
          </p>
        </div>
      </footer>
    </div>
  )
}
