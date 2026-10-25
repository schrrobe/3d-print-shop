import { Prisma } from '@prisma/client'
import { REVENUE_ORDER_STATUSES } from '@print-shop/utils'
import { salesChannelSchema } from '@print-shop/validators'
import { Router } from 'express'
import QRCode from 'qrcode'
import { z } from 'zod'
import { env } from '../../env.js'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'

export const adminSalesChannelsRouter = Router()

const rangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date() })
const linkFor = (code: string) => `${env.WEB_URL.replace(/\/$/, '')}/r/${code}`

/**
 * Channels with clicks and attributed paid orders in [from, to). Revenue is the
 * frozen commission base (goods after discount, no shipping); shopRevenueCents
 * is the same measure over all paid orders so the UI can show each channel's share.
 */
adminSalesChannelsRouter.get(
  '/',
  requirePermission('sales-channels:read'),
  async (req, res, next) => {
    try {
      const { from, to } = rangeSchema.parse(req.query)
      if (from >= to) throw badRequest('from muss vor to liegen')
      const range = { gte: from, lt: to }
      const paid = { status: { in: [...REVENUE_ORDER_STATUSES] }, createdAt: range }
      const [channels, clicks, orders, shop] = await Promise.all([
        prisma.salesChannel.findMany({
          include: { voucher: { select: { code: true } }, product: { select: { slug: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.salesChannelClick.groupBy({
          by: ['salesChannelId'],
          where: { createdAt: range },
          _count: { _all: true },
        }),
        prisma.order.groupBy({
          by: ['salesChannelId'],
          where: { ...paid, salesChannelId: { not: null } },
          _count: { _all: true },
          _sum: { commissionBaseCents: true, commissionCents: true },
        }),
        prisma.order.aggregate({ where: paid, _sum: { subtotalCents: true, discountCents: true } }),
      ])
      res.json({
        shopRevenueCents: (shop._sum.subtotalCents ?? 0) - (shop._sum.discountCents ?? 0),
        channels: channels.map((c) => {
          const o = orders.find((r) => r.salesChannelId === c.id)
          return {
            ...c,
            url: linkFor(c.code),
            clicks: clicks.find((r) => r.salesChannelId === c.id)?._count._all ?? 0,
            orders: o?._count._all ?? 0,
            revenueCents: o?._sum.commissionBaseCents ?? 0,
            commissionCents: o?._sum.commissionCents ?? 0,
          }
        }),
      })
    } catch (err) {
      next(err)
    }
  },
)

function prismaError(err: unknown): Error | unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
    return badRequest('Produkt oder Gutschein existiert nicht')
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = String(err.meta?.target ?? '')
    return conflict(
      target.includes('voucherId')
        ? 'Gutschein gehört bereits zu einem anderen Verkaufskanal'
        : 'Code bereits vergeben',
    )
  }
  return err
}

adminSalesChannelsRouter.post(
  '/',
  requirePermission('sales-channels:write'),
  async (req, res, next) => {
    try {
      const input = salesChannelSchema.parse(req.body)
      const channel = await prisma.salesChannel.create({ data: input })
      await audit(req, 'sales_channel.create', { type: 'sales_channel', id: channel.id }, input)
      res.status(201).json({ channel: { ...channel, url: linkFor(channel.code) } })
    } catch (err) {
      next(prismaError(err))
    }
  },
)

/** Full update; the code stays fixed so links already handed out keep working. */
adminSalesChannelsRouter.put(
  '/:id',
  requirePermission('sales-channels:write'),
  async (req, res, next) => {
    try {
      const { code: _code, ...input } = salesChannelSchema.parse(req.body)
      void _code
      const existing = await prisma.salesChannel.findUnique({
        where: { id: String(req.params.id) },
      })
      if (!existing) throw notFound('Verkaufskanal nicht gefunden')
      const channel = await prisma.salesChannel.update({ where: { id: existing.id }, data: input })
      await audit(req, 'sales_channel.update', { type: 'sales_channel', id: channel.id }, input)
      res.json({ channel: { ...channel, url: linkFor(channel.code) } })
    } catch (err) {
      next(prismaError(err))
    }
  },
)

adminSalesChannelsRouter.get(
  '/:id/qr.svg',
  requirePermission('sales-channels:read'),
  async (req, res, next) => {
    try {
      const channel = await prisma.salesChannel.findUnique({ where: { id: String(req.params.id) } })
      if (!channel) throw notFound('Verkaufskanal nicht gefunden')
      res
        .type('image/svg+xml')
        .send(await QRCode.toString(linkFor(channel.code), { type: 'svg', margin: 1 }))
    } catch (err) {
      next(err)
    }
  },
)
