import rateLimit from 'express-rate-limit'
import { isProduction } from '../env.js'

/**
 * Strict limits in production; relaxed outside so the e2e suite
 * (which logs in dozens of times) does not trip them.
 */

/** Limiter for credential endpoints (login, password reset). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many attempts, try again later' },
})

/** Limiter for expensive public endpoints (uploads, checkout). */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 30 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, try again later' },
})
