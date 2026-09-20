import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, todayKey } from '../../lib/store'
import { getCoach } from '../../data/coaches'
import { api } from '../../lib/api'
import { buildLocalWarMap } from '../../../server/shared/warmap.ts'
import { CoachFace } from '../../components/CoachFace'
import { Card, Rise } from '../../components/ui'
import { Board, BuildLog, HorizonBar, Phases } from '../../components/WarMapView'

/**
 * The war map. Phases across the rest of the year, each with an objective
 * and key results, and the board of moves that make them happen. Built by
 * the coach in the background; refreshed as calls add and tick tasks.
 */
export default function WarMapPage() {
  const { state, online, setWarMap } = useStore()
  const profile = state.profile!
  const coach = getCoach(profile.coachId)
  const [status, setStatus] = useState<'building' | 'ready' | 'failed' | 'none'>(state.warmap ? 'ready' : 'none')
  const [progress, setProgress] = useState('')
  const [rebuilding, setRebuilding] = useState(false)
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!online) {
      if (!state.warmap && profile.plan.roadmap) {
        const local = buildLocalWarMap({
          statement: profile.plan.statement, targetDate: profile.plan.targetDate, today: todayKey(),
          areaIds: profile.areaIds?.length ? profile.areaIds : [profile.areaId],
          milestones: profile.plan.roadmap.milestones, obstacles: profile.plan.obstacles, skills: profile.plan.skills, supporters: profile.plan.supporters,
        })
        setWarMap(local.map, local.tasks.map((t, i) => ({ ...t, id: `t${i}`, createdAt: Date.now(), doneAt: null })))
        setStatus('ready')
      }
      return
    }
    const fetch = async () => {
      try {
        const r = await api.coach.warmap()
        setStatus(r.status)
        setProgress(r.progress)
        if (r.map) setWarMap(r.map, r.tasks)
        if (r.status !== 'building' && poll.current) {
          clearInterval(poll.current)
          poll.current = null
        }
      } catch {
        setStatus('failed')
      }
    }
    fetch()
    poll.current = setInterval(fetch, 4000)
    return () => {
      if (poll.current) clearInterval(poll.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const rebuild = async () => {
    setRebuilding(true)
    await api.coach.rebuildWarmap().catch(() => {})
    setStatus('building')
    setProgress('Drafting the map')
    setRebuilding(false)
    if (!poll.current) {
      poll.current = setInterval(async () => {
        const r = await api.coach.warmap().catch(() => null)
        if (!r) return
        setStatus(r.status)
        setProgress(r.progress)
        if (r.map) setWarMap(r.map, r.tasks)
        if (r.status !== 'building' && poll.current) {
          clearInterval(poll.current)
          poll.current = null
        }
      }, 4000)
    }
  }

  const map = state.warmap

  return (
    <div className="space-y-5">
      <Rise>
        <div className="flex items-center gap-4">
          <CoachFace coach={coach} size="lg" playing={status === 'building'} speaking={status === 'building'} />
          <div className="min-w-0">
            <h1 className="display-tight text-3xl font-semibold">War map.</h1>
            <p className="text-ink-secondary">
              {status === 'building' ? progress || 'Building…' : map ? `To ${new Date(`${map.horizon.end}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}` : 'Your strategic plan'}
            </p>
          </div>
        </div>
      </Rise>

      {!profile.plan.roadmap && (
        <Rise delay={0.05}>
          <Card className="p-5">
            <p className="font-semibold">Start with the plan</p>
            <p className="mt-1 text-sm text-ink-secondary">{coach.name} reverse-engineers your goal first; the war map builds from it.</p>
            <Link to="/app/plan" className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">Build my plan</Link>
          </Card>
        </Rise>
      )}

      {status === 'building' && !map && (
        <Rise delay={0.05}>
          <Card className="p-5">
            <p className="font-semibold">{coach.name} is working on it</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Drafting the year, then putting it in front of a tough review, then revising. Usually a minute or two. You can leave this page.
            </p>
            <p className="mt-3 text-sm text-accent">{progress}</p>
          </Card>
        </Rise>
      )}

      {map && (
        <>
          <Rise delay={0.05}>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">North star</p>
              <p className="mt-1 text-xl font-semibold leading-snug">{map.northStar}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{map.strategy}</p>
              <div className="mt-4">
                <HorizonBar map={map} />
              </div>
              {status === 'building' && <p className="mt-3 text-sm text-accent">Rebuilding: {progress}</p>}
            </Card>
          </Rise>

          <Rise delay={0.1}>
            <Board />
          </Rise>

          <Rise delay={0.15}>
            <Card className="p-5">
              <h2 className="mb-3 font-semibold">Phases</h2>
              <Phases map={map} />
            </Card>
          </Rise>

          {map.risks.length > 0 && (
            <Rise delay={0.2}>
              <Card className="p-5">
                <h2 className="font-semibold">What could derail it</h2>
                <ul className="mt-2 space-y-2 text-[15px]">
                  {map.risks.map((r) => (
                    <li key={r.risk}>
                      <span className="font-medium">{r.risk}</span>
                      <span className="text-ink-secondary"> — {r.mitigation}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Rise>
          )}

          <Rise delay={0.25}>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <BuildLog map={map} />
              {online && (
                <button onClick={rebuild} disabled={rebuilding || status === 'building'} className="text-ink-secondary disabled:opacity-40">
                  Rebuild from scratch
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
              Tasks you commit to on a call land here automatically; tell {coach.name} you've done one and it's ticked. Reviewed weekly overnight.
            </p>
          </Rise>
        </>
      )}
    </div>
  )
}
