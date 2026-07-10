import { useState } from 'react'

export default function TagInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  suggestions?: string[]
}) {
  const [draft, setDraft] = useState('')

  const add = (text: string) => {
    const t = text.trim()
    if (!t || values.includes(t)) return
    onChange([...values, t])
    setDraft('')
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl bg-black/[0.04] px-4 py-3 text-[15px] outline-none ring-accent/50 transition-shadow focus:ring-2"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="shrink-0 rounded-2xl bg-accent px-4 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          disabled={!draft.trim()}
        >
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="shrink-0 rounded-full bg-black/[0.04] px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-black/[0.08]"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-accent/60 hover:text-accent"
                aria-label={`Remove ${v}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
