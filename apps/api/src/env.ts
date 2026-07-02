import process from 'node:process'
import { z } from 'zod'

// Load ./.env when present (dev convenience — CI/production use real env vars)
try {
  process.loadEnvFile()
} catch {
  /* no .env file — fine */
}

const envSchema = z.object({
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
})

export const env = envSchema.parse(process.env)

export const isProduction = env.NODE_ENV === 'production'
/** Dev helpers (mock payment confirmation endpoints) are enabled outside production only. */
export const devEndpointsEnabled = !isProduction
