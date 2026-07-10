import { createHash } from 'node:crypto'
import { renderPasswordReset } from '@print-shop/emails'
import type { UserRole } from '@print-shop/types'
import { permissionsForRole } from '@print-shop/utils'
import { loginSchema, passwordResetRequestSchema } from '@print-shop/validators'
import argon2 from 'argon2'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { randomToken } from '../../lib/tokens.js'
import {
  requireAuth,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from '../../middleware/auth.js'
import { unauthorized } from '../../middleware/error.js'
import { authLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'

export const adminAuthRouter = Router()

adminAuthRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } })
    if (!user || !user.active) throw unauthorized('Invalid credentials')
    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) throw unauthorized('Invalid credentials')

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name as UserRole,
    }
    res.cookie(
      SESSION_COOKIE,
      signSession(sessionUser, user.sessionVersion),
      sessionCookieOptions(),
    )
    req.user = sessionUser
    await audit(req, 'auth.login', { type: 'user', id: user.id })
    res.json({ user: { ...sessionUser, permissions: permissionsForRole(sessionUser.role) } })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.post('/logout', async (req, res) => {
  // Best effort: JWTs cannot be revoked client-side, so mark all of the
  // user's sessions as invalidated (requireAuth rejects older tokens).
  const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE]
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
      await prisma.user.update({
        where: { id: String(payload.sub) },
        data: { sessionsInvalidatedAt: new Date() },
      })
    } catch {
      // Invalid/expired token or unknown user — nothing to invalidate.
    }
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

adminAuthRouter.get('/me', requireAuth, (req, res) => {
  const user = req.user!
  res.json({ user: { ...user, permissions: permissionsForRole(user.role) } })
})

/** Requests a password reset link (always responds 200 to avoid user enumeration). */
adminAuthRouter.post('/password-reset-request', authLimiter, async (req, res, next) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (user && user.active) {
      const token = randomToken(32)
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      })
      await sendEmail(
        user.email,
        'password_reset',
        renderPasswordReset(
          { name: user.name, resetUrl: `${env.WEB_URL}/admin/reset-password?token=${token}` },
          'de',
        ),
      )
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

const passwordResetSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(12).max(200),
})

adminAuthRouter.post('/password-reset', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = passwordResetSchema.parse(req.body)
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw unauthorized('Invalid or expired reset token')
    }
    const passwordHash = await argon2.hash(password)
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (consumed.count !== 1) throw unauthorized('Invalid or expired reset token')
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      })
      // A successful credential reset invalidates every outstanding reset link.
      await tx.passwordResetToken.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() },
      })
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
