import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../lib/api'
import { uid, useStore } from '../lib/store'
import { getCoach } from '../data/coaches'
import { CoachFace } from './CoachFace'

interface Item { label: string; portion: string; calories: number; confidence: 'low' | 'medium' | 'high' }
interface Analysis { items: Item[]; totalCalories: number; isFood: boolean; coachNote: string }

/** Shrink a photo in the browser so uploads are quick on mobile data */
async function toJpeg(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

/**
 * Snap a meal. The coach identifies what's on the plate and estimates the
 * calories; you tick what's right and it's logged. Only with an account —
 * the analysis runs on the server.
 */
export default function MealPhoto() {
  const { state, addFood, online } = useStore()
  const coach = getCoach(state.profile!.coachId)
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Analysis | null>(null)
  const [selected, setSelected] = useState<boolean[]>([])
  const [error, setError] = useState<string | null>(null)

  if (!online) return null

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const dataUrl = await toJpeg(file)
      setPreview(dataUrl)
      const r = await api.foodPhoto(dataUrl)
      setResult(r)
      setSelected(r.items.map(() => true))
    } catch (e) {
      setError((e as Error).message || "Couldn't read that photo")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const log = () => {
    if (!result) return
    result.items.forEach((it, i) => {
      if (selected[i]) addFood({ id: uid(), label: it.label, calories: it.calories, kind: 'food', timestamp: Date.now() })
    })
    setResult(null)
    setPreview(null)
  }

  const total = result ? result.items.reduce((s, it, i) => s + (selected[i] ? it.calories : 0), 0) : 0

  return (
    <div className="mt-3">
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-[15px] font-medium text-white disabled:opacity-60"
      >
        {busy ? `${coach.name} is looking…` : '📷 Snap a meal — calories from a photo'}
      </button>
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 overflow-hidden rounded-3xl bg-white shadow-card hairline">
            {preview && <img src={preview} alt="Your meal" className="h-40 w-full object-cover" />}
            <div className="p-4">
              {!result.isFood ? (
                <p className="text-sm text-ink-secondary">That doesn't look like food. Try another photo.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {result.items.map((it, i) => (
                      <li key={i}>
                        <button
                          onClick={() => setSelected((s) => s.map((v, j) => (j === i ? !v : v)))}
                          className="flex w-full items-start gap-3 text-left"
                        >
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${selected[i] ? 'border-leaf bg-leaf text-white' : 'border-black/20'}`}>
                            {selected[i] ? '✓' : ''}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-medium">{it.label}</span>
                            <span className="block text-xs text-ink-secondary">
                              {it.portion}
                              {it.confidence === 'low' && ' · rough guess'}
                            </span>
                          </span>
                          <span className="text-[15px] font-semibold tabular-nums">{it.calories}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {result.coachNote && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-fog p-3">
                      <CoachFace coach={coach} size="sm" tappable={false} />
                      <p className="text-sm leading-relaxed">{result.coachNote}</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-ink-secondary">
                      Total <strong className="text-ink">{total} kcal</strong> · estimate
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setResult(null)} className="rounded-full px-4 py-2 text-sm text-ink-secondary">Discard</button>
                      <button onClick={log} disabled={total === 0} className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
                        Log it
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
