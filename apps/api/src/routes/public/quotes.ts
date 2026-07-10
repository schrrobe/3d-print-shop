import { renderQuoteAccepted } from '@print-shop/emails'
import type { Prisma } from '@prisma/client'
import { addressSchema } from '@print-shop/validators'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { createStripePaymentLink } from '../../services/payments/stripe.js'

export const quotesRouter = Router()

const acceptedQuoteInclude = {
  quoteRequest: true,
  order: { include: { payments: true } },
} as const

const STALE_PAYMENT_PREPARATION_MS = 15 * 60 * 1000

async function ensureQuotePaymentLink(
  order: Prisma.OrderGetPayload<{ include: { payments: true } }>,
  locale: string,
): Promise<{ url: string; created: boolean }> {
  const payment = order.payments.find((p) => p.status !== 'failed')
  if (!payment) throw new Error(`Quote order ${order.orderNumber} has no payment`)
  if (payment.stripePaymentLinkUrl) return { url: payment.stripePaymentLinkUrl, created: false }

  if (payment.status === 'processing') {
    await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: 'processing',
        stripeSessionId: null,
        updatedAt: { lte: new Date(Date.now() - STALE_PAYMENT_PREPARATION_MS) },
      },
      data: { status: 'pending' },
    })
  }

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'pending', stripeSessionId: null },
    data: { status: 'processing' },
  })
  if (claimed.count !== 1) throw conflict('Payment link is already being prepared; retry shortly')

  try {
    const link = await createStripePaymentLink({
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      amountCents: order.totalCents,
      email: order.email,
      locale,
      description: `Individuelles Angebot ${order.orderNumber}`,
    })
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'processing', stripeSessionId: null },
      data: {
        status: 'pending',
        stripeSessionId: link.sessionId,
        stripePaymentLinkUrl: link.url,
      },
    })
    if (updated.count !== 1) {
      // Our claim was lost (e.g. a stale-reset let another request take over).
      // Don't overwrite the newer link; return it if present, else signal retry.
      const existing = await prisma.payment.findUnique({
        where: { id: payment.id },
        select: { stripePaymentLinkUrl: true },
      })
      if (existing?.stripePaymentLinkUrl) {
        return { url: existing.stripePaymentLinkUrl, created: false }
      }
      throw conflict('Payment link state changed; retry shortly')
    }
    return { url: link.url, created: true }
  } catch (err) {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: 'processing', stripeSessionId: null },
      data: { status: 'pending' },
    })
    throw err
  }
}

/** Public quote view for the customer (token from the quote email). */
quotesRouter.get('/:token', async (req, res, next) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { token: String(req.params.token) },
      include: { quoteRequest: true, order: { select: { orderNumber: true, accessToken: true } } },
    })
    if (!quote || quote.status === 'draft') throw notFound('Quote not found')
    res.json({
      quote: {
        status: quote.status,
        priceCents: quote.priceCents,
        message: quote.message,
        validUntil: quote.validUntil,
        expired: quote.validUntil < new Date() && quote.status === 'sent',
        request: {
          name: quote.quoteRequest.name,
          description: quote.quoteRequest.description,
          quantity: quote.quoteRequest.quantity,
        },
        order: quote.order
          ? { orderNumber: quote.order.orderNumber, accessToken: quote.order.accessToken }
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
})

/** Customer accepts the quote → order + Stripe payment link. */
quotesRouter.post('/:token/accept', sensitiveLimiter, async (req, res, next) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { token: String(req.params.token) },
      include: acceptedQuoteInclude,
    })
    if (!quote || quote.status === 'draft') throw notFound('Quote not found')
    let order = quote.order
    if (quote.status === 'sent') {
      if (quote.validUntil < new Date()) {
        await prisma.quote.updateMany({
          where: { id: quote.id, status: 'sent' },
          data: { status: 'expired' },
        })
        throw conflict('Quote expired')
      }
      const address = addressSchema.parse(req.body?.address ?? {})
      const orderNumber = generateOrderNumber()
      const accessToken = randomToken()
      order = await prisma.$transaction(async (tx) => {
        const claimed = await tx.quote.updateMany({
          where: { id: quote.id, status: 'sent', validUntil: { gt: new Date() } },
          data: { status: 'accepted', decidedAt: new Date() },
        })
        if (claimed.count !== 1) throw conflict('Quote was already decided')
        const created = await tx.order.create({
          data: {
            orderNumber,
            accessToken,
            status: 'awaiting_payment',
            locale: quote.quoteRequest.locale,
            email: address.email,
            firstName: address.firstName,
            lastName: address.lastName,
            company: address.company,
            street: address.street,
            zip: address.zip,
            city: address.city,
            country: address.country,
            phone: address.phone,
            subtotalCents: quote.priceCents,
            shippingCents: 0,
            totalCents: quote.priceCents,
            items: {
              create: [
                {
                  name: `3D-Druck nach Kundenmodell (${quote.quoteRequest.name}, ${quote.quoteRequest.quantity} Stück)`,
                  quantity: 1,
                  unitPriceCents: quote.priceCents,
                },
              ],
            },
            payments: {
              create: {
                method: 'stripe_payment_link',
                status: 'pending',
                amountCents: quote.priceCents,
              },
            },
          },
          include: { payments: true },
        })
        await tx.quote.update({ where: { id: quote.id }, data: { orderId: created.id } })
        await tx.quoteRequest.update({
          where: { id: quote.quoteRequestId },
          data: { status: 'accepted' },
        })
        return created
      })
    } else if (quote.status !== 'accepted' || !order) {
      throw conflict(`Quote already ${quote.status}`)
    }

    const link = await ensureQuotePaymentLink(order, quote.quoteRequest.locale)

    if (link.created) {
      await sendEmail(
        order.email,
        'quote_accepted',
        renderQuoteAccepted(
          { name: quote.quoteRequest.name, priceCents: quote.priceCents, paymentUrl: link.url },
          quote.quoteRequest.locale,
        ),
      )
    }

    res.json({
      paymentUrl: link.url,
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
    })
  } catch (err) {
    next(err)
  }
})

/** Customer declines the quote. */
quotesRouter.post('/:token/decline', sensitiveLimiter, async (req, res, next) => {
  try {
    const quote = await prisma.quote.findUnique({ where: { token: String(req.params.token) } })
    if (!quote || quote.status === 'draft') throw notFound('Quote not found')
    if (quote.status !== 'sent') throw conflict(`Quote already ${quote.status}`)
    await prisma.$transaction(async (tx) => {
      const declined = await tx.quote.updateMany({
        where: { id: quote.id, status: 'sent' },
        data: { status: 'declined', decidedAt: new Date() },
      })
      if (declined.count !== 1) throw conflict('Quote was already decided')
      await tx.quoteRequest.update({
        where: { id: quote.quoteRequestId },
        data: { status: 'rejected' },
      })
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// keep import used for future body validation of decline reasons
void badRequest
