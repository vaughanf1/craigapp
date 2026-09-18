import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { api, type Schedule } from '../lib/api'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import { getCoach } from '../data/coaches'
import { Card } from './ui'

/**
 * When and how your coach gets hold of you. The schedule lives on the
 * server (it's the server that rings you); this is its control panel.
 */
export default function CallSettings() {
  const { state, online } = useStore()
  const navigate = useNavigate()
  const coach = getCoach(state.profile!.coachId)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [push, setPush] = useState<PushState>('off')
  const [callsAvailable, setCallsAvailable] = useState(false)
  const [pushAvailable, setPushAvailable] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!online) return
    api.me().then((me) => {
      setSchedule(me.schedule)
      setCallsAvailable(me.calls.enabled)
      setPushAvailable(me.push.enabled)
    }).catch(() => {})
    pushState().then(setPush)
  }, [online])

  const save = async (next: Schedule) => {
    setSchedule(next)
    try {
      setSchedule(await api.saveSchedule(next))
    } catch {
      setNote("Couldn't save — try again.")
    }
  }

  const togglePush = async () => {
    if (!schedule) return
    setBusy('push')
    try {
      if (schedule.channels.includes('push')) {
        setPush(await disablePush())
        await save({ ...schedule, channels: schedule.channels.filter((c) => c !== 'push') })
      } else {
        const s = await enablePush()
        setPush(s)
        if (s === 'on') await save({ ...schedule, channels: [...schedule.channels, 'push'] })
        else setNote(s === 'denied' ? 'Notifications are blocked for this site — allow them in your browser settings.' : 'Notifications aren\'t supported here. On iPhone, add Be More to your Home Screen first.')
      }
    } catch (e) {
      setNote((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const toggleCall = () =>
    schedule &&
    save({
      ...schedule,
      channels: schedule.channels.includes('call') ? schedule.channels.filter((c) => c !== 'call') : [...schedule.channels, 'call'],
    })

  const callNow = async (channels: ('push' | 'call')[]) => {
    setBusy('now')
    try {
      if (channels.length === 0) return navigate('/app/call')
      await api.coach.callNow(channels)
      setNote(channels.includes('call') ? `${coach.name} is ringing ${state.session?.phone}…` : 'Notification sent — tap it to answer.')
    } catch (e) {
      setNote((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (!online) {
    return (
      <Card className="p-5">
        <h2 className="font-semibold">Calls & check-ins</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          {coach.name} can ring you every morning and evening — a real call to your phone, or a notification that opens
          a video call in the app. Sign in with your number to switch it on.
        </p>
        <div className="mt-4 flex gap-2">
          <Link to="/signin" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">Sign in</Link>
          <button onClick={() => navigate('/app/call')} className="rounded-full bg-black/[0.05] px-5 py-2.5 text-sm font-medium">
            Preview a call
          </button>
        </div>
      </Card>
    )
  }

  const toggle = (on: boolean, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-leaf' : 'bg-black/[0.15]'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  )

  return (
    <Card className="divide-y divide-black/5 p-0">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Calls & check-ins</h2>
            <p className="text-sm text-ink-secondary">When {coach.name} gets in touch</p>
          </div>
          {schedule && toggle(schedule.enabled, () => save({ ...schedule, enabled: !schedule.enabled }))}
        </div>
        {schedule && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {schedule.times.map((t, i) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-black/[0.05] py-1 pl-3 pr-1 text-sm font-medium">
                <input
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const times = [...schedule.times]
                    times[i] = e.target.value
                    if (e.target.value) save({ ...schedule, times })
                  }}
                  className="bg-transparent outline-none"
                />
                {schedule.times.length > 1 && (
                  <button onClick={() => save({ ...schedule, times: schedule.times.filter((_, j) => j !== i) })} className="h-6 w-6 rounded-full text-ink-secondary hover:bg-black/10" aria-label="Remove time">
                    ×
                  </button>
                )}
              </span>
            ))}
            {schedule.times.length < 5 && (
              <button onClick={() => save({ ...schedule, times: [...schedule.times, '13:00'] })} className="rounded-full border border-dashed border-black/20 px-3 py-1 text-sm text-ink-secondary">
                + add a time
              </button>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-ink-secondary">First call of the day looks back and sets today's focus; the last one is your evening review.</p>
      </div>

      <div className="flex items-center justify-between p-5">
        <div>
          <p className="font-semibold">Notification call</p>
          <p className="text-sm text-ink-secondary">
            {push === 'denied' ? 'Blocked in browser settings' : pushAvailable ? 'Opens a video call in the app' : 'Not configured on this server'}
          </p>
        </div>
        {schedule && toggle(schedule.channels.includes('push') && push === 'on', togglePush, busy === 'push' || !pushAvailable)}
      </div>

      <div className="flex items-center justify-between p-5">
        <div>
          <p className="font-semibold">Phone call</p>
          <p className="text-sm text-ink-secondary">
            {callsAvailable ? `Rings ${state.session?.phone}` : 'Calling isn\'t switched on for this server yet'}
          </p>
        </div>
        {schedule && toggle(schedule.channels.includes('call'), toggleCall, !callsAvailable)}
      </div>

      <div className="p-5">
        <p className="font-semibold">Call me now</p>
        <p className="text-sm text-ink-secondary">{coach.name} will ring with a brief built from your last day.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => callNow([])} disabled={busy === 'now'} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40">
            In the app
          </button>
          {pushAvailable && push === 'on' && (
            <button onClick={() => callNow(['push'])} disabled={busy === 'now'} className="rounded-full bg-black/[0.05] px-5 py-2.5 text-sm font-medium disabled:opacity-40">
              Send a notification
            </button>
          )}
          {callsAvailable && (
            <button onClick={() => callNow(['call'])} disabled={busy === 'now'} className="rounded-full bg-black/[0.05] px-5 py-2.5 text-sm font-medium disabled:opacity-40">
              Ring my phone
            </button>
          )}
        </div>
        {note && <p className="mt-3 text-sm text-ink-secondary">{note}</p>}
      </div>
    </Card>
  )
}
