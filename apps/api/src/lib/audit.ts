import type { Request } from 'express'
import { prisma } from './prisma.js'

/** Records an admin action in the audit log. Never throws. */
export async function audit(
  req: Request,
  action: string,
  entity?: { type: string; id: string },
  details?: unknown,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action,
        entityType: entity?.type ?? null,
        entityId: entity?.id ?? null,
        details: details === undefined ? undefined : JSON.parse(JSON.stringify(details)),
      },
    })
  } catch (err) {
    console.error('[audit] failed to write audit log:', err)
  }
}
