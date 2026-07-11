import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { COACHES, getCoach } from '../../data/coaches'
import { speak } from '../../lib/coach'
import { Card, CoachAvatar, Disclaimer, Rise } from '../../components/ui'
import type { VoiceAccent } from '../../lib/types'

export default function Settings() {
  const { state, updateProfile, reset } = useStore()
  const navigate = useNavigate()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)

  const previewVoice = (accent: VoiceAccent) => {
    const c = getCoach(profile.coachId)
    speak(`Hello ${profile.name}, this is how I'll sound. Let's be more, together.`, accent, c.gender)
  }

  return (
    <div className="space-y-5">
      <Rise>
        <h1 className="display-tight text-3xl font-semibold">Settings.</h1>
      </Rise>

      <Rise delay={0.05}>
        <Card className="p-5">
          <h2 className="font-semibold">Your coach</h2>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {COACHES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  updateProfile({ coachId: c.id })
                  if (profile.voiceEnabled)
                    speak(`Hi ${profile.name}, ${c.name} here. Let's do this together.`, profile.accent, c.gender)
                }}
                className={`flex shrink-0 flex-col items-center rounded-3xl p-3 transition-all ${
                  profile.coachId === c.id ? 'bg-accent/10 ring-2 ring-accent' : 'hover:bg-black/[0.03]'
                }`}
              >
                <CoachAvatar coach={c} size="sm" />
                <p className="mt-1.5 text-xs font-medium">{c.name}</p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-secondary">{coach.bio}</p>
        </Card>
      </Rise>

      <Rise delay={0.1}>
        <Card className="divide-y divide-black/5 p-0">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-semibold">Accent</p>
              <p className="text-sm text-ink-secondary">British or American voice</p>
            </div>
            <div className="flex gap-1 rounded-full bg-black/[0.05] p-1">
              {(['british', 'american'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    updateProfile({ accent: a })
                    previewVoice(a)
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                    profile.accent === a ? 'bg-white shadow-card' : 'text-ink-secondary'
                  }`}
                >
                  {a === 'british' ? '🇬🇧 UK' : '🇺🇸 US'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-semibold">Voice</p>
              <p className="text-sm text-ink-secondary">Your coach speaks messages aloud</p>
            </div>
            <button
              onClick={() => updateProfile({ voiceEnabled: !profile.voiceEnabled })}
              className={`relative h-8 w-14 rounded-full transition-colors ${
                profile.voiceEnabled ? 'bg-leaf' : 'bg-black/[0.15]'
              }`}
              role="switch"
              aria-checked={profile.voiceEnabled}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition-all ${
                  profile.voiceEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Check-ins per day</p>
                <p className="text-sm text-ink-secondary">How often {coach.name} checks in</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => updateProfile({ checkInsPerDay: n })}
                  className={`rounded-2xl py-2.5 font-semibold transition-all ${
                    profile.checkInsPerDay === n
                      ? 'bg-accent text-white'
                      : 'bg-black/[0.05] text-ink hover:bg-black/[0.08]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {profile.areaId === 'health' && (
            <div className="p-5">
              <p className="font-semibold">Daily calorie target</p>
              <input
                type="number"
                value={profile.calorieTarget ?? 2000}
                onChange={(e) => updateProfile({ calorieTarget: Number(e.target.value) || 2000 })}
                className="mt-2 w-full rounded-2xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none ring-accent/50 focus:ring-2"
              />
            </div>
          )}
        </Card>
      </Rise>

      <Rise delay={0.15}>
        <Card className="space-y-3 p-5">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'bemore-data.json'
              a.click()
              URL.revokeObjectURL(a.href)
            }}
            className="w-full rounded-full bg-black/[0.05] py-3 font-medium transition-colors hover:bg-black/[0.08]"
          >
            Download my data
          </button>
          <button
            onClick={() => {
              if (confirm('Start over? This clears your goal, streak and chat history.')) {
                reset()
                navigate('/')
              }
            }}
            className="w-full rounded-full bg-coral/10 py-3 font-medium text-coral transition-colors hover:bg-coral/15"
          >
            Reset & start over
          </button>
        </Card>
      </Rise>

      <Rise delay={0.2}>
        <Disclaimer />
        <p className="mt-3 text-xs text-ink-secondary">
          Be More v{__APP_VERSION__} ·{' '}
          <Link to="/privacy" className="text-accent">Privacy</Link> ·{' '}
          <Link to="/terms" className="text-accent">Terms</Link>
        </p>
      </Rise>
    </div>
  )
}
