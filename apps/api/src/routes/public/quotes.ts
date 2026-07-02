import { renderQuoteAccepted } from '@print-shop/emails'
import { addressSchema } from '@print-shop/validators'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { badRequest, conflict, notFound } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { createStripePaymentLink } from '../../services/payments/stripe.js'

export const quotesRouter = Router()

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
      include: { quoteRequest: true },
    })
    if (!quote || quote.status === 'draft') throw notFound('Quote not found')
    if (quote.status !== 'sent') throw conflict(`Quote already ${quote.status}`)
    if (quote.validUntil < new Date()) {
      await prisma.quote.update({ where: { id: quote.id }, data: { status: 'expired' } })
      throw conflict('Quote expired')
    }
    const address = addressSchema.parse(req.body?.address ?? {})

    const orderNumber = generateOrderNumber()
    const accessToken = randomToken()
    const order = await prisma.order.create({
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
        // Quote price is the all-in total (shipping included in the individual quote)
        subtotalCents: quote.priceCents,
        shippingCents: 0,
        totalCents: quote.priceCents,
        items: {
          create: [
            {
              name: `3D-Druck nach Kundenmodell (${quote.quoteRequest.name})`,
              quantity: quote.quoteRequest.quantity,
              unitPriceCents: Math.round(quote.priceCents / quote.quoteRequest.quantity),
            },
          ],
        },
      },
    })

    const link = await createStripePaymentLink({
      orderNumber,
      accessToken,
      amountCents: quote.priceCents,
      email: address.email,
      locale: quote.quoteRequest.locale,
      description: `Individuelles Angebot ${orderNumber}`,
    })
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'stripe_payment_link',
        status: 'pending',
        amountCents: quote.priceCents,
        stripeSessionId: link.sessionId,
        stripePaymentLinkUrl: link.url,
      },
    })
    await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'accepted', decidedAt: new Date(), orderId: order.id },
      }),
      prisma.quoteRequest.update({
        where: { id: quote.quoteRequestId },
        data: { status: 'accepted' },
      }),
    ])

    await sendEmail(
      address.email,
      'quote_accepted',
      renderQuoteAccepted(
        { name: quote.quoteRequest.name, priceCents: quote.priceCents, paymentUrl: link.url },
        quote.quoteRequest.locale,
      ),
    )

    res.json({ paymentUrl: link.url, orderNumber, accessToken })
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
    await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'declined', decidedAt: new Date() },
      }),
      prisma.quoteRequest.update({
        where: { id: quote.quoteRequestId },
        data: { status: 'rejected' },
      }),
    ])
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// keep import used for future body validation of decline reasons
void badRequest
