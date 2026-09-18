# Switching Be More on for real

Everything below is optional in development (the server simulates it and logs
what it *would* have done). For a live demo where Craig's phone actually
rings, you need all four.

## 1. The coach brain — Anthropic (5 min)

1. console.anthropic.com → API keys → create key.
2. `server/.env`: `ANTHROPIC_API_KEY=sk-ant-...`

Turns on: real conversations, the reverse-engineered plan, morning/evening
briefs, memory extraction, nightly plan reviews. Model is `claude-opus-5`
with a server-side fallback to Opus 4.8.

Rough cost per active user per day: two briefs + one memory pass + a short
call ≈ 25–40k input tokens (mostly cached) and ~2k output ≈ **£0.05–0.10**.

## 2. Phone calls + SMS codes — Twilio (20 min)

One account, one number, rings everyone.

1. twilio.com → sign up → upgrade (trial accounts can only call verified numbers).
2. **Phone Numbers → Buy a number** → United Kingdom → Voice + SMS. UK numbers need a
   regulatory bundle (business/personal address) — do it once, takes ~15 min to approve.
   This is the number people see when their coach rings. A mobile (07…) number
   gets answered more than a geographic one.
3. **Verify → Create service** ("Be More") → copy the Service SID (`VA…`). This sends
   the sign-in codes from Twilio's own pool; it doesn't use your number.
4. Account SID + Auth Token are on the console home page.
5. `server/.env`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_VERIFY_SID=VA...
   TWILIO_FROM_NUMBER=+447...
   PUBLIC_URL=https://<your server>   # Twilio fetches call scripts from here
   ```

Concurrency: each call is its own channel — one number can dial hundreds of
people at 09:00 at once. Cost ≈ £0.02–0.04/min for UK mobiles, so two 3-minute
calls a day ≈ **£4–7 per user per month**. Speech recognition on the call is
included.

For a **local** test, expose the server with `ngrok http 8787` and set
`PUBLIC_URL` to the ngrok URL. The number, Twilio's speech recognition and
the coach voice all work through the tunnel.

## 3. Notification calls — Web Push (2 min)

```
cd server && npm run vapid
```
Paste the two lines into `server/.env`. This is the *backup* channel: if the
phone isn't rung (or the user opts out), a notification opens the in-app video
call. Free.

iPhone: users must add Be More to their Home Screen for push to work — the
Settings screen says so.

## 4. Deploy (30 min)

The server needs to be up 24/7 for the scheduler to ring people.

```
fly launch --copy-config --no-deploy      # uses fly.toml (London region, never sleeps)
fly volumes create data --size 1
fly secrets set SESSION_SECRET=$(openssl rand -hex 32) ANTHROPIC_API_KEY=... \
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_VERIFY_SID=... TWILIO_FROM_NUMBER=... \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
  PUBLIC_URL=https://bemore-api.fly.dev APP_URL=https://<pages url>
fly deploy
```

Then in GitHub → repo → Settings → Variables → `API_URL = https://bemore-api.fly.dev`
and push: the Pages build points the app at the server. ~£3–5/month for the
machine.

## What runs in the background once it's on

| When | What |
|---|---|
| Every minute | Anyone whose local clock hits a call time gets a fresh brief and a call (+ notification backup) |
| ~20s after a chat/call ends | Memory extraction: facts, day summary, actions done/missed, stated weight |
| 03:00 local, weekly (or after 3 days if clearly behind) | Plan review: keep or adjust; changes explained on the next morning call |
