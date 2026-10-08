/**
 * All configuration comes from the environment. Anything optional degrades
 * gracefully: no Twilio → codes are logged and calls are simulated; no VAPID
 * keys → push is disabled; no Anthropic key → the SDK's own credential chain.
 */
const e = process.env

export const env = {
  port: Number(e.PORT ?? 8787),
  dbPath: e.DB_PATH ?? './data/bemore.sqlite',
  /** Public URL of this server — Twilio needs it for webhooks */
  publicUrl: (e.PUBLIC_URL ?? `http://localhost:${e.PORT ?? 8787}`).replace(/\/$/, ''),
  /** Public URL(s) of the web app, comma-separated — the first is used in push links, all for CORS */
  appUrl: (e.APP_URL ?? 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, ''),
  appUrls: (e.APP_URL ?? 'http://localhost:5173'),
  sessionSecret: e.SESSION_SECRET ?? 'dev-secret-change-me',
  /** Fixed sign-in code used when Twilio Verify is not configured. Set explicitly in production for demos; unset → random codes logged server-side. */
  devOtp: e.DEV_OTP ?? (e.NODE_ENV === 'production' ? '' : '123456'),

  twilio: {
    accountSid: e.TWILIO_ACCOUNT_SID ?? '',
    authToken: e.TWILIO_AUTH_TOKEN ?? '',
    verifySid: e.TWILIO_VERIFY_SID ?? '',
    fromNumber: e.TWILIO_FROM_NUMBER ?? '',
    get enabled() {
      return Boolean(this.accountSid && this.authToken)
    },
  },

  vapid: {
    publicKey: e.VAPID_PUBLIC_KEY ?? '',
    privateKey: e.VAPID_PRIVATE_KEY ?? '',
    subject: e.VAPID_SUBJECT ?? 'mailto:hello@bemore.app',
    get enabled() {
      return Boolean(this.publicKey && this.privateKey)
    },
  },

  /** Calls: hard cap enforced by Twilio, soft cap where the coach starts wrapping up, and a turn cap */
  call: {
    maxSeconds: Number(e.CALL_MAX_SECONDS ?? 240),
    wrapUpSeconds: Number(e.CALL_WRAP_UP_SECONDS ?? 150),
    maxTurns: Number(e.CALL_MAX_TURNS ?? 6),
  },

  /**
   * Coach voices (text-to-speech). Provider-agnostic shape; ElevenLabs is the first implementation.
   * No key → every request falls back to the browser's own speech. Caps are in characters because
   * that is how providers bill; the budget is the monthly ceiling in USD across all users.
   */
  tts: {
    elevenLabsKey: e.ELEVENLABS_API_KEY ?? '',
    /** ElevenLabs Agents agent used for live two-way in-app calls (overrides enabled for prompt, first message, voice) */
    agentId: e.ELEVENLABS_AGENT_ID ?? '',
    /** multilingual_v2 is the expressive model; flash_v2_5 is half the price per character but audibly flatter (testers noticed) */
    model: e.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
    /** USD per 1M characters, for the cost log. ElevenLabs API list price: ~80 for multilingual_v2, ~40 for flash. */
    costPer1MUsd: Number(e.TTS_COST_PER_1M_USD ?? 80),
    perUserDailyChars: Number(e.TTS_USER_DAILY_CHARS ?? 15_000),
    globalDailyChars: Number(e.TTS_GLOBAL_DAILY_CHARS ?? 1_000_000),
    monthlyBudgetUsd: Number(e.TTS_MONTHLY_BUDGET_USD ?? 100),
    get enabled() {
      return Boolean(this.elevenLabsKey)
    },
  },

  isProd: e.NODE_ENV === 'production',
}

if (env.isProd && env.sessionSecret === 'dev-secret-change-me') {
  throw new Error('SESSION_SECRET must be set in production')
}
