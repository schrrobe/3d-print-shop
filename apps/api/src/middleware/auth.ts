import type { UserRole } from '@print-shop/types'
import { hasPermission, type Permission } from '@print-shop/utils'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { forbidden, unauthorized } from './error.js'

export const SESSION_COOKIE = 'ps_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8h admin sessions

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser
    }
  }
}

export function signSession(user: SessionUser, sessionVersion: number): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name, ver: sessionVersion },
    env.JWT_SECRET,
    { expiresIn: SESSION_TTL_SECONDS, algorithm: 'HS256' },
  )
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // strict is safe here: admin pages load their data client-side, so the
    // cookie is never needed on a cross-site top-level navigation.
    sameSite: 'strict' as const,
    secure: env.COOKIE_SECURE,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  }
}

/** Requires a valid session cookie and an active user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE]
    if (!token) throw unauthorized()
    let payload: jwt.JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload
    } catch {
      throw unauthorized('Invalid or expired session')
    }
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      include: { role: true },
    })
    if (!user || !user.active) throw unauthorized('User inactive or deleted')
    // Password changes bump sessionVersion, revoking all previously issued JWTs.
    if (!Number.isInteger(payload.ver) || payload.ver !== user.sessionVersion) {
      throw unauthorized('Session has been revoked')
    }
    // Logout stamps sessionsInvalidatedAt. Second-granularity comparison (JWT
    // iat is in seconds) so a login in the same second as a logout is not rejected.
    if (
      user.sessionsInvalidatedAt &&
      typeof payload.iat === 'number' &&
      payload.iat < Math.floor(user.sessionsInvalidatedAt.getTime() / 1000)
    ) {
      throw unauthorized('Session was invalidated, please log in again')
    }
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role.name as UserRole }
    next()
  } catch (err) {
    next(err)
  }
}

/** Role-based access control — checks the permission matrix from @print-shop/utils. */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized())
    if (!hasPermission(req.user.role, permission)) {
      return next(forbidden(`Missing permission: ${permission}`))
    }
    next()
  }
}
