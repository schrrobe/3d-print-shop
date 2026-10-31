import type { Request } from 'express'
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

/**
 * Requests without X-Forwarded-For did not pass nginx (the API port is bound to
 * 127.0.0.1) — they are Nuxt SSR fetches from the web container and would all
 * share one key.
 */
const isInternal = (req: Request) => !req.get('x-forwarded-for')

/**
 * Baseline for every public route (catalog, files, token-gated reads); stricter
 * limiters stack on top. Generous — image-heavy pages need headroom — so it only
 * caps floods and scrapers. Admin has auth and its own mutation limiter.
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 600 : 100_000,
  skip: (req) => isInternal(req) || req.originalUrl.startsWith('/api/admin'),
  identifier: 'public',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, try again later' },
})

/** Limiter for product image resizes (`?w=`): every one re-runs sharp, uncached. */
export const imageResizeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? 300 : 100_000,
  skip: (req) => isInternal(req) || req.query.w === undefined,
  identifier: 'image-resize',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, try again later' },
})
