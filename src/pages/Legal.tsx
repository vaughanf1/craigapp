import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const PRIVACY = {
  title: 'Privacy Policy',
  sections: [
    {
      h: 'Your data stays on your device',
      p: 'Be More stores everything — your name, goals, check-ins, chat history and food log — locally in your browser or device storage. Nothing is sent to our servers, because there are none: the app runs entirely on your device. Deleting the app or using “Reset & start over” in Settings permanently erases your data.',
    },
    {
      h: 'What we don’t do',
      p: 'We don’t collect analytics, set tracking cookies, sell data, or share anything with third parties. Your goals and conversations are yours alone.',
    },
    {
      h: 'Voice',
      p: 'The coach’s voice uses your device’s built-in speech engine. Nothing you type or hear leaves your device.',
    },
    {
      h: 'Your rights',
      p: 'You can export a full copy of your data at any time from Settings, and erase it completely with “Reset & start over”. Questions? Contact us and we’ll help.',
    },
    {
      h: 'Changes',
      p: 'If a future version of Be More introduces online features (such as AI conversations or account sync), this policy will be updated first and you’ll be asked before any data leaves your device.',
    },
  ],
}

const TERMS = {
  title: 'Terms & Disclaimer',
  sections: [
    {
      h: 'What Be More is',
      p: 'Be More is a motivational companion. It encourages you, reminds you of your own goals, and helps you keep track of your progress.',
    },
    {
      h: 'What Be More is not',
      p: 'Be More is not a medical, psychological, financial, or professional advice service, and its content must not be treated as such. Calorie and exercise figures are approximate estimates only. For health matters — including weight loss, quitting smoking, or mental well-being — always consult a qualified professional before making changes.',
    },
    {
      h: 'No guarantee of results',
      p: 'Results depend entirely on your own efforts and circumstances. Following the app’s suggestions does not guarantee you will achieve your goal, and we accept no responsibility for outcomes, decisions, or actions you take based on the app’s content.',
    },
    {
      h: 'Use at your own judgement',
      p: 'You are responsible for setting goals that are safe and appropriate for you. If a goal affects your health, get professional guidance first. Stop using any suggestion that feels wrong for your situation.',
    },
    {
      h: 'Liability',
      p: 'To the fullest extent permitted by law, Be More and its creators are not liable for any loss or damage arising from use of the app.',
    },
  ],
}

export default function Legal({ section }: { section: 'privacy' | 'terms' }) {
  const doc = section === 'privacy' ? PRIVACY : TERMS
  return (
    <div className="min-h-screen bg-fog">
      <header className="glass sticky top-0 z-50 border-b border-black/5">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo className="h-5 w-5" /> Be More
          </Link>
          <Link to="/" className="text-sm text-accent">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="display-tight text-4xl font-semibold">{doc.title}</h1>
        <p className="mt-2 text-sm text-ink-secondary">Last updated: July 2026</p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-semibold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-ink-secondary">{s.p}</p>
            </section>
          ))}
        </div>
        <div className="mt-12 flex gap-6 border-t border-black/5 pt-6 text-sm">
          <Link to="/privacy" className="text-accent">Privacy Policy</Link>
          <Link to="/terms" className="text-accent">Terms & Disclaimer</Link>
        </div>
      </main>
    </div>
  )
}
