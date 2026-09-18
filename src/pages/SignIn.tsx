import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { useStore } from '../lib/store'
import Logo from '../components/Logo'
import { PrimaryButton } from '../components/ui'

/**
 * Passwordless sign-in by phone. The number you sign in with is the number
 * your coach rings — that's the whole point.
 */
export default function SignIn() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { state, hydrate } = useStore()
  const [phone, setPhone] = useState(state.session?.phone ?? '')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'phone' | 'code'>('phone')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devHint, setDevHint] = useState(false)

  const next = params.get('next') ?? '/app'

  const requestCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.auth.requestCode(phone)
      setDevHint(r.dev)
      setStage('code')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError(null)
    try {
      const user = await api.auth.verify(phone, code)
      // A profile built on this device before signing in moves to the account
      if (!user.profile && state.profile) await api.saveProfile(state.profile)
      hydrate(await api.me())
      const profile = user.profile ?? state.profile
      navigate(!profile ? '/start' : profile.plan.roadmap ? next.replace('/app/plan', '/app') : next, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-2xl bg-white px-5 py-4 text-center text-[22px] tracking-wide shadow-card outline-none ring-accent/50 transition-shadow focus:ring-2'

  return (
    <div className="flex min-h-screen flex-col bg-fog">
      <header className="glass sticky top-0 z-50 border-b border-black/5">
        <div className="mx-auto flex h-12 max-w-2xl items-center px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo className="h-5 w-5" /> Be More
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-6 pt-14">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {stage === 'phone' ? (
            <>
              <h1 className="display-tight text-3xl font-semibold">Your number.</h1>
              <p className="mt-3 text-ink-secondary">
                This is the number your coach will ring. We'll text you a code to confirm it's you — no passwords.
              </p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && phone && requestCode()}
                placeholder="07700 900123"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                className={`mt-8 ${input}`}
              />
              <PrimaryButton className="mt-4 w-full" disabled={phone.trim().length < 6 || busy} onClick={requestCode}>
                {busy ? 'Sending…' : 'Text me a code'}
              </PrimaryButton>
            </>
          ) : (
            <>
              <h1 className="display-tight text-3xl font-semibold">Check your texts.</h1>
              <p className="mt-3 text-ink-secondary">Enter the 6-digit code we sent to {phone}.</p>
              {devHint && (
                <p className="mt-2 rounded-2xl bg-accent/10 px-4 py-2 text-sm text-accent">
                  Dev mode — the code is <strong>123456</strong> (SMS isn't configured on this server).
                </p>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && verify()}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className={`mt-8 ${input}`}
              />
              <PrimaryButton className="mt-4 w-full" disabled={code.length < 4 || busy} onClick={verify}>
                {busy ? 'Checking…' : 'Sign in'}
              </PrimaryButton>
              <button onClick={() => setStage('phone')} className="mt-4 w-full text-sm text-accent">
                Wrong number?
              </button>
            </>
          )}
          {error && <p className="mt-4 text-center text-sm text-coral">{error}</p>}
          <p className="mt-10 text-xs leading-relaxed text-ink-secondary">
            By continuing you agree to our <Link to="/terms" className="text-accent">Terms</Link> and{' '}
            <Link to="/privacy" className="text-accent">Privacy Policy</Link>. Standard message rates may apply.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
