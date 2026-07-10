import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError } from './error.js'

/** Magic-link portal lifetime; renewal is a single click on the request form. */
export const PORTAL_TOKEN_TTL_DAYS = 30
/** Newest N tokens stay valid per email — older ones are revoked on issue. */
export const PORTAL_TOKEN_MAX_ACTIVE = 3

export function hashPortalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      portalEmail?: string
      portalTokenId?: string
    }
  }
}

/**
 * Validates the magic-link token from the Authorization header (never a query
 * string → tokens stay out of server logs). Only the sha256 hash is looked up;
 * plaintext tokens are never stored. Distinguishes expired from invalid so the
 * UI can offer a renewal form.
 */
export async function requirePortalToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
    if (!token) throw new ApiError(401, 'Missing portal token', 'invalid_portal_token')

    const row = await prisma.magicLinkToken.findUnique({ where: { tokenHash: hashPortalToken(token) } })
    if (!row || row.revokedAt) throw new ApiError(401, 'Invalid portal token', 'invalid_portal_token')
    if (row.expiresAt < new Date()) {
      throw new ApiError(401, 'Portal token expired', 'expired_portal_token')
    }

    req.portalEmail = row.email
    req.portalTokenId = row.id
    // Lightweight usage audit — fire and forget, never blocks the request.
    void prisma.magicLinkToken
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date(), useCount: { increment: 1 } } })
      .catch((err) => console.error('[portal-auth] usage stats update failed:', err))
    next()
  } catch (err) {
    next(err)
  }
}

/** Portal access log — fire and forget (same never-throw contract as audit()). */
export async function portalAccessLog(
  req: Request,
  action: string,
  entityId?: string,
): Promise<void> {
  if (!req.portalTokenId) return
  try {
    await prisma.portalAccessLog.create({
      data: { tokenId: req.portalTokenId, action, entityId: entityId ?? null, ip: req.ip ?? null },
    })
  } catch (err) {
    console.error('portal access log failed', err)
  }
}
