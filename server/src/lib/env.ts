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

  isProd: e.NODE_ENV === 'production',
}

if (env.isProd && env.sessionSecret === 'dev-secret-change-me') {
  throw new Error('SESSION_SECRET must be set in production')
}
