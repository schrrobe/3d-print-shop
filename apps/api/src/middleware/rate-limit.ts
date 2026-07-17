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

/**
 * Limiter for the tracking ingest endpoint. Generous — a normal session flushes
 * a handful of batches; this only caps a runaway client or a flood from one IP.
 * In-memory store, so it degrades to per-instance under horizontal scaling.
 */
export const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 900 : 100_000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests' },
})

/**
 * Limiter for admin mutations (POST/PATCH/DELETE on /api/admin). Generous —
 * it only caps runaway scripts or abuse of a stolen session, not normal work.
 * Reads are unlimited; mounted before auth, so it keys by IP.
 */
export const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 1500 : 5000,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, try again later' },
})
