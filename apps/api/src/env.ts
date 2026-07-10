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
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
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
