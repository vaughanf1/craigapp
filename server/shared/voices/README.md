# Coach voice guides

One JSON file per coach. The words are data: edit them here, no code changes
needed. The shared coaching rules (not-a-yes-man, the execution ladder,
diagnosis before prescription, safety, memory) live in
`server/src/coach/rules.ts` and apply to every coach — never repeat them here.

| Field | What goes in it |
| --- | --- |
| `coachId` | Matches `id` in `server/shared/coaches.ts` and the file name |
| `methodology` | One of the twelve keys in `types.ts` (`METHODOLOGIES`) |
| `method` | The approach in one or two sentences, in this coach's own terms |
| `rhythm.pattern` | `short-clipped`, `long-discursive`, `questioning` or `measured` |
| `rhythm.notes` | Typical sentence length, punctuation habits, shape of a turn |
| `vocabulary` | 15–20 words and phrases they reach for |
| `banned` | 10 or more things this coach would never say |
| `catchphrases` | 3–5 **original** phrases. Nothing borrowed from any real coach, author or public figure |
| `moments.*` | `approach` (how they handle it) plus one `example` line, for: morning open, evening open, goal hit, missed once, missed repeatedly, struggling |
| `examples` | 8–10 lines showing the voice in action |

After editing, run `npm run test:server` — `test/voices.test.ts` checks the
counts, that no two coaches share a catchphrase or example, and that every
file parses against the schema.

Adding a coach: create `<id>.json`, import it in `index.ts`, add the coach to
`coaches.ts`.
