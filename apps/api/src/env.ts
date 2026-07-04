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
