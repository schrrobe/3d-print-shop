import { renderQuoteAccepted } from '@print-shop/emails'
import { addressSchema } from '@print-shop/validators'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { assertCompanyComplete } from '../../services/company.js'
import { sendEmail } from '../../services/email.js'
import { orderUrl } from '../../services/order-flow.js'

export const quotesRouter = Router()

const acceptedQuoteInclude = {
  quoteRequest: true,
  order: { include: { payments: true } },
} as const

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

/**
 * Customer accepts the quote → order awaiting payment, paid via the order page
 * (card or PayPal there; ADR 0002). Retrying an accepted quote returns the same link.
 */
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
      assertCompanyComplete()
      const address = addressSchema.parse(req.body?.address ?? {})
      const orderNumber = generateOrderNumber()
      const accessToken = randomToken()
      // No Stripe object yet: the order page starts card or PayPal payment.
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
            source: 'quote',
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
                method: 'stripe',
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
      await sendEmail(
        order.email,
        'quote_accepted',
        renderQuoteAccepted(
          {
            name: quote.quoteRequest.name,
            priceCents: quote.priceCents,
            paymentUrl: orderUrl(order),
          },
          quote.quoteRequest.locale,
        ),
      )
    } else if (quote.status !== 'accepted' || !order) {
      throw conflict(`Quote already ${quote.status}`)
    }

    // Legacy: quotes accepted before ADR 0002 keep their already-sent Stripe Payment Link.
    const legacyLink = order.payments.find(
      (p) => p.method === 'stripe_payment_link' && p.stripePaymentLinkUrl,
    )?.stripePaymentLinkUrl
    res.json({
      paymentUrl: legacyLink ?? orderUrl(order),
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
