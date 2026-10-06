import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { getCoach } from '../data/coaches'
import DealExplainer from '../components/DealExplainer'
import Logo from '../components/Logo'
import { PrimaryButton } from '../components/ui'

/** Standalone page for the accountability pricing — demo-able, shareable, and linked from the commit screen. */
export default function Deal() {
  const navigate = useNavigate()
  const { state } = useStore()
  const coach = state.profile ? getCoach(state.profile.coachId) : null
  return (
    <div className="min-h-screen bg-fog">
      <header className="glass sticky top-0 z-50 border-b border-black/5">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo className="h-5 w-5" /> Be More
          </Link>
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="text-sm text-accent">
            Close
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10 pb-28">
        <DealExplainer coachName={coach?.name} />
      </main>
      <footer className="glass fixed inset-x-0 bottom-0 border-t border-black/5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl items-center justify-end px-6 pt-4">
          <PrimaryButton onClick={() => navigate(state.profile ? '/app' : '/start')}>{state.profile ? 'Back to today' : 'Get started'}</PrimaryButton>
        </div>
      </footer>
    </div>
  )
}
