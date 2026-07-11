# Be More ✨

**Your personal AI coach.** Be More is a "gym buddy for your whole life" — an AI coach that
checks in with you every day, motivates you, encourages you, and brings you back on track
towards whatever goal you're chasing.

> "You can change who you are, and where you are, by changing what goes into your mind." — Zig Ziglar

## Features

- **One-page shopfront** — Apple-style marketing landing page selling the app
- **Pick your coach** — 8 AI coaches (male/female, 20s–50s), each with a distinct style,
  and a **British or American voice** (spoken aloud via the browser's speech synthesis)
- **10 life areas** — Health & Fitness, Wealth & Finance, Career & Work, Family & Relationships,
  Personal Development, Spirituality & Mindfulness, Lifestyle & Leisure, Community & Contribution,
  Break Bad Habits, and Legacy & Life Purpose
- **The 7-step goal framework** — write the goal down, what's in it for you, supporters,
  obstacles, skills to learn, plan of action, and a target date
- **Daily check-ins** — your coach asks how it's going (20 rotating questions per life area),
  celebrates streaks with supportive statements, and responds to bad days with one of 20
  "I understand" responses plus de-stress suggestions
- **Coach chat** — message your coach any time; replies route on sentiment (good day / bad day /
  stressed) with 40 motivational sayings in the mix
- **Calorie tracker** — for health goals: log food and exercise (quick-add common items,
  e.g. 20 min treadmill ≈ 300 kcal burned) against a daily target
- **Check-in frequency** — choose 1–5 coach check-ins per day in Settings

Everything persists locally in the browser (localStorage) — no account needed for the MVP.

## Production

- **PWA**: installable to the home screen (manifest + service worker), works offline after first visit
- **Privacy by architecture**: all data stays on-device; export or erase it any time from Settings
- **Legal**: `/privacy` and `/terms` pages with the required disclaimers
- **Quality gates**: `npm test` (22 tests covering the coach engine, streak logic and the content
  spec — 20 questions/statements per area, 40 sayings, 20 understanding responses) and `npm run lint`
  both run in CI before every deploy
- **Deploys**: every push to the main branch runs tests, builds with `--base=/craigapp/` and
  publishes to GitHub Pages via the `gh-pages` branch
- **Resilience**: error boundary with friendly recovery, storage guarded for private browsing,
  reduced-motion support, code-split routes

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com) with an Apple-inspired design system
  (SF-style type, frosted glass, hairline borders, spring animations)
- [Framer Motion](https://www.framer.com/motion/) for animation
- [React Router](https://reactrouter.com) for navigation
- Web Speech API for the coach's voice

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## Roadmap

- Real LLM-powered coach conversations (Claude API)
- Push notifications for scheduled check-ins
- Native iOS/Android wrappers + web-direct purchase (avoiding store fees)
- Localisation: Chinese, French, German, Italian, Spanish
- Photo-real avatar coaches with lip-synced speech

## Disclaimer

Be More is a motivational companion, not a medical, financial or professional advice service.
Results depend on your own efforts and are not guaranteed. For health concerns, always consult
a qualified professional.
