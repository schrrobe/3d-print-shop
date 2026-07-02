import rateLimit from 'express-rate-limit'

/** Strict limiter for credential endpoints (login, password reset). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many attempts, try again later' },
})

/** Limiter for expensive public endpoints (uploads, checkout). */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, try again later' },
})
