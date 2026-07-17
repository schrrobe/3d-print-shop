import process from 'node:process'
import { z } from 'zod'

// Load ./.env when present (dev convenience — CI/production use real env vars)
try {
  process.loadEnvFile()
} catch {
  /* no .env file — fine */
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().default(3001),
    API_URL: z.string().url().default('http://localhost:3001'),
    WEB_URL: z.string().url().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(8).default('dev-only-secret-change-me'),
    COOKIE_SECURE: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    UPLOAD_DIR: z.string().default('./uploads'),
    UPLOAD_MAX_BYTES: z.coerce.number().int().default(52_428_800),
    RESEND_API_KEY: z.string().optional().default(''),
    EMAIL_FROM: z.string().default('Print Shop <noreply@example.com>'),
    ADMIN_NOTIFICATION_EMAIL: z.string().default('admin@example.com'),
    RESEND_WEBHOOK_SECRET: z.string().optional().default(''),
    TICKET_REPLY_DOMAIN: z.string().optional().default(''),
    STRIPE_SECRET_KEY: z.string().optional().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
    BITCOIN_PROVIDER: z.enum(['mock', 'blockchain-api']).default('mock'),
    BITCOIN_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    BITCOIN_XPUB: z.string().optional().default(''),
    BITCOIN_REQUIRED_CONFIRMATIONS: z.coerce.number().int().min(1).default(2),
    BANK_ACCOUNT_HOLDER: z.string().default('Print Shop GmbH'),
    BANK_IBAN: z.string().default('DE00 0000 0000 0000 0000 00'),
    BANK_BIC: z.string().default('XXXXDEXXXXX'),
    INVOICE_DIR: z.string().default('./invoices'),
    INVOICE_PREFIX: z.string().default('RE'),
    // --- Invoice PDF: company identity (placeholders — set real values before go-live) ---
    COMPANY_NAME: z.string().default('Print Shop GmbH'),
    COMPANY_STREET: z.string().default('Musterstraße 1'),
    COMPANY_ZIP: z.string().default('12345'),
    COMPANY_CITY: z.string().default('Berlin'),
    COMPANY_EMAIL: z.string().default('info@example.com'),
    COMPANY_PHONE: z.string().default('+49 30 0000000'),
    COMPANY_WEBSITE: z.string().default('www.example.com'),
    /// Steuernummer — printed in the footer (§14 UStG mandatory detail)
    COMPANY_TAX_NUMBER: z.string().default('12/345/67890'),
    COMPANY_OWNER: z.string().default('Max Mustermann'),
    /// Optional PNG/JPEG letterhead logo; empty = company name rendered as text
    INVOICE_LOGO_PATH: z.string().optional().default(''),
    PAYMENT_TERMS_DAYS: z.coerce.number().int().min(0).default(14),
    // §19 UStG small-business VAT-exemption note. Default true reflects the current
    // small-business status; flip to 'false' once VAT-liable (no code change needed).
    COMPANY_VAT_EXEMPT: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    // --- Social media publishing (Meta Graph API; "mock" needs no credentials) ---
    SOCIAL_PUBLISHING_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
    SOCIAL_PUBLISHING_CRON_ENABLED: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    SOCIAL_PUBLISHING_CRON_INTERVAL_SECONDS: z.coerce.number().int().min(5).default(60),
    META_APP_ID: z.string().optional().default(''),
    META_APP_SECRET: z.string().optional().default(''),
    META_GRAPH_API_VERSION: z.string().default('v23.0'),
    META_FACEBOOK_PAGE_ID: z.string().optional().default(''),
    META_FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional().default(''),
    META_INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional().default(''),
    META_INSTAGRAM_ACCESS_TOKEN: z.string().optional().default(''),
    // --- Conversion tracking ---
    // Nightly retention/reconciliation worker (opt-in; single-instance assumption).
    TRACKING_RETENTION_CRON_ENABLED: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    TRACKING_RETENTION_CRON_INTERVAL_SECONDS: z.coerce.number().int().min(60).default(3600),
    /// Event row retention (~13 months); older events are purged nightly.
    TRACKING_EVENT_RETENTION_DAYS: z.coerce.number().int().min(30).default(395),
    /// Session metadata (UA, click ids) is anonymized after this many days.
    TRACKING_SESSION_ANON_DAYS: z.coerce.number().int().min(7).default(90),
    // Marketing-destination outbox worker (Phase 3; ships disabled).
    TRACKING_OUTBOX_CRON_ENABLED: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    TRACKING_OUTBOX_CRON_INTERVAL_SECONDS: z.coerce.number().int().min(5).default(60),
    // Access tokens live in env, NEVER in ShopSettings (that row is exposed publicly
    // via /api/tracking-settings). Empty = destination disabled. Destinations
    // are enqueue-time decisions: enabling one later does not send retroactively.
    TRACKING_DESTINATIONS_PROVIDER: z.enum(['mock', 'live']).default('mock'),
    META_CAPI_ACCESS_TOKEN: z.string().optional().default(''),
    META_CAPI_PIXEL_ID: z.string().optional().default(''),
    /// Meta Events Manager test-events verification; empty = real delivery.
    META_CAPI_TEST_EVENT_CODE: z.string().optional().default(''),
    TIKTOK_EVENTS_ACCESS_TOKEN: z.string().optional().default(''),
    TIKTOK_PIXEL_CODE: z.string().optional().default(''),
    /// TikTok Events Manager test-events verification; empty = real delivery.
    TIKTOK_TEST_EVENT_CODE: z.string().optional().default(''),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      if (
        val.JWT_SECRET.length < 32 ||
        ['dev-only-secret-change-me', 'change-me-in-production'].includes(val.JWT_SECRET)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be a unique secret of at least 32 characters in production',
        })
      }
      if (!val.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production',
        })
      }
      if (!val.WEB_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WEB_URL'],
          message: 'WEB_URL must use HTTPS in production',
        })
      }
      if (!val.STRIPE_SECRET_KEY || !val.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_SECRET_KEY'],
          message: 'Stripe secret and webhook keys are required in production',
        })
      }
      if (/printshop:(?:printshop|change-me-local)@/i.test(val.DATABASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL still contains the example database password',
        })
      }
      // These identity/bank fields are printed on legally-binding invoices
      // (§14 UStG mandatory details) and encoded into the GiroCode. Fail fast
      // at boot rather than let placeholder defaults reach a real invoice.
      const placeholders: Record<string, string> = {
        COMPANY_NAME: 'Print Shop GmbH',
        COMPANY_STREET: 'Musterstraße 1',
        COMPANY_ZIP: '12345',
        COMPANY_CITY: 'Berlin',
        COMPANY_EMAIL: 'info@example.com',
        COMPANY_PHONE: '+49 30 0000000',
        COMPANY_WEBSITE: 'www.example.com',
        COMPANY_TAX_NUMBER: '12/345/67890',
        COMPANY_OWNER: 'Max Mustermann',
        BANK_ACCOUNT_HOLDER: 'Print Shop GmbH',
        BANK_IBAN: 'DE00 0000 0000 0000 0000 00',
        BANK_BIC: 'XXXXDEXXXXX',
      }
      for (const [key, placeholder] of Object.entries(placeholders)) {
        if (val[key as keyof typeof val] === placeholder) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must be set to a real value in production (still the placeholder default)`,
          })
        }
      }
      // Session cookies are signed with this secret — the dev default or a
      // short value would make admin sessions forgeable.
      if (val.JWT_SECRET === 'dev-only-secret-change-me' || val.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be a unique random value of at least 32 characters in production',
        })
      }
      // Without the webhook secret, unsigned (forgeable) Stripe events would
      // be accepted and could mark orders as paid.
      if (val.STRIPE_SECRET_KEY && !val.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_WEBHOOK_SECRET'],
          message: 'STRIPE_WEBHOOK_SECRET is required in production when STRIPE_SECRET_KEY is set',
        })
      }
    }
    if (val.BITCOIN_ENABLED && val.BITCOIN_PROVIDER === 'mock' && val.NODE_ENV === 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['BITCOIN_PROVIDER'],
        message: 'BITCOIN_ENABLED requires a real provider in production',
      })
    }
    // Tracking destinations: a half-configured credential pair is always a
    // mistake — fail at boot instead of silently skipping every send.
    const destinationPairs = [
      ['META_CAPI_ACCESS_TOKEN', 'META_CAPI_PIXEL_ID'],
      ['TIKTOK_EVENTS_ACCESS_TOKEN', 'TIKTOK_PIXEL_CODE'],
    ] as const
    for (const [tokenKey, idKey] of destinationPairs) {
      if (!val[tokenKey] !== !val[idKey]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [val[tokenKey] ? idKey : tokenKey],
          message: `${tokenKey} and ${idKey} must be set together (or both left empty)`,
        })
      }
    }
    if (
      val.TRACKING_DESTINATIONS_PROVIDER === 'live' &&
      val.TRACKING_OUTBOX_CRON_ENABLED &&
      destinationPairs.every(([tokenKey, idKey]) => !val[tokenKey] || !val[idKey])
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TRACKING_DESTINATIONS_PROVIDER'],
        message:
          'TRACKING_DESTINATIONS_PROVIDER=live with the outbox cron enabled requires at least one configured destination (Meta CAPI or TikTok Events)',
      })
    }
    if (val.SOCIAL_PUBLISHING_PROVIDER !== 'meta') return
    for (const key of [
      'META_APP_ID',
      'META_APP_SECRET',
      'META_FACEBOOK_PAGE_ID',
      'META_FACEBOOK_PAGE_ACCESS_TOKEN',
      'META_INSTAGRAM_BUSINESS_ACCOUNT_ID',
      'META_INSTAGRAM_ACCESS_TOKEN',
    ] as const) {
      if (!val[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when SOCIAL_PUBLISHING_PROVIDER=meta`,
        })
      }
    }
  })

export const env = envSchema.parse(process.env)

export const isProduction = env.NODE_ENV === 'production'
/** Dev helpers (mock payment confirmation endpoints) are enabled outside production only. */
export const devEndpointsEnabled = !isProduction
