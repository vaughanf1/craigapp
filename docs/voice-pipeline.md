# One voice per coach — how the avatar, the app and the phone stay in sync

The rule: a coach has exactly one voice, stored as `voiceId` on their record in
`server/shared/coaches.ts`. Everything that speaks as that coach reads that field.
Nothing picks a voice by gender or accent any more.

```
coaches.ts  voiceId ──┬──> in-app call      POST /coach/speak  → audio (cached, capped, logged)
                      ├──> phone call       speak({ format: 'ulaw_8000' })  → Twilio <Play>   (Part 4b, not wired yet)
                      └──> intro clip       re-dubbed with the same voice, recorded in public/coaches/manifest.json
```

## Layers

| Layer | File | What it does |
| --- | --- | --- |
| Provider | `server/src/audio/elevenlabs.ts` | Text + voiceId → bytes. The only ElevenLabs-specific code. Swap providers here. |
| speak() | `server/src/audio/speak.ts` | Cache → caps → provider → cost log. Never throws; returns a fallback reason instead. |
| Route | `POST /coach/speak` | 200 + audio, or 204 + `X-Voice-Fallback: <reason>` meaning "use browser speech". |
| Client | `src/lib/voice.ts` | Plays server audio; falls back to the browser's own speech on 204, offline, autoplay block or error. |
| Stats | `GET /coach/speak/stats` | Per-user and global characters, cost in USD, cache hits, fallbacks — the real per-user economics. |

Env: `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL`, `TTS_COST_PER_1M_USD`, `TTS_USER_DAILY_CHARS`,
`TTS_GLOBAL_DAILY_CHARS`, `TTS_MONTHLY_BUDGET_USD` (see `server/.env.example`). With no key, every
request falls back to browser speech and is logged as such, so nothing breaks.

Cache key is `sha256(provider|model|voiceId|format|normalised text)`: identical text in the same voice is
never generated twice, and cache hits are free, don't count against caps, and still serve when caps are hit.

## Creating the twelve voices (needs the ElevenLabs key)

```bash
cd server && ELEVENLABS_API_KEY=... node --no-warnings=ExperimentalWarning scripts/voices-create.ts
```

Uses Voice Design: each coach's `voiceDesign` text (age, gender, accent, manner) becomes a **synthetic**
voice. No real person's voice is cloned, which keeps us inside the legal rule. Three previews per coach land in
`server/data/voice-previews/` for a human ear-test (`--pick fiona=2` to choose a different preview), and the
script prints each `voiceId` to paste into `coaches.ts`. A native speaker should check the regional accents
before sign-off; see `docs/voice-provider-research.md` for why ElevenLabs is the provisional choice and what
the cheaper fallbacks are.

### Status on 6 Oct 2026

Nine coaches have their own designed voice (Maya, Sophia, Marcus, Fiona, Karim, Priya, Arun, Ken, Grace);
previews are in `server/data/voice-previews/<id>-{1,2,3}.mp3` and preview 1 was used for each. Three coaches
are on ElevenLabs **premade stand-ins** because the Starter plan has 10 voice slots and one was already taken:
Jake → "George", David → "Daniel", Margaret → "Alice". All three are RP, middle-aged, and the premade
catalogue is withdrawn on 31 Dec 2026, so they must be replaced with designed voices once the plan has slots
(Creator has 30). The Starter quota is 90,000 characters a month, roughly 300 coach turns: enough to test,
not to run users on. The key lives only in `server/.env` (git-ignored); the Node scripts load it via
`--env-file-if-exists=.env`. Railway needs it set as a variable.

## Re-dubbing the intro clips so the avatar speaks in the call voice

A generated clip arrives with its own invented voice. To make the intro match the call:

1. Generate the intro line with the coach's real voice: `speak({ coachId, text: <line from manifest.json> })`
   or the provider's dashboard. Save as `<id>-line.mp3`.
2. Lip-sync the existing clip to that audio with HeyGen (video + audio → re-rendered mouth) or Simli. The face
   and framing stay exactly as Craig approved; only the mouth and the audio change.
3. Drop the result in as `public/coaches/<id>.mp4` (same size budget, ~2 MB, 720×1280, 8 s).
4. Record it: `node --no-warnings=ExperimentalWarning scripts/intro-manifest.ts --dubbed <id>`.

`server/test/manifest.test.ts` then enforces it: any coach with a `voiceId` whose clip is not marked dubbed to
that exact voice fails the suite, so the two can't drift apart when a voice is changed later.

## Phone calls (later)

The phone pipeline asks `speak()` for `ulaw_8000` and serves the bytes via Twilio `<Play>` or Media Streams,
replacing the four shared Polly voices. Same cache, same caps, same cost log. Until then `phoneVoice` remains
on the coach record as the Polly stand-in.
