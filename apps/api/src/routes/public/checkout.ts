import { renderAdminNotification } from '@print-shop/emails'
import type { ColorZoneSlot, Locale } from '@print-shop/types'
import { calcCartTotals, resolveColorSelection } from '@print-shop/utils'
import { checkoutSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { badRequest } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { sendOrderConfirmation } from '../../services/order-flow.js'
import { bitcoinProvider } from '../../services/payments/bitcoin.js'
import { createStripeCheckoutSession } from '../../services/payments/stripe.js'

export const checkoutRouter = Router()

function productName(
  translations: { locale: string; name: string }[],
  locale: Locale,
): string {
  return (
    translations.find((t) => t.locale === locale)?.name ??
    translations.find((t) => t.locale === 'de')?.name ??
    translations[0]?.name ??
    'Product'
  )
}

checkoutRouter.post('/', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body)
    if (input.paymentMethod === 'stripe_payment_link') {
      throw badRequest('stripe_payment_link is reserved for quotes')
    }

    const products = await prisma.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, active: true },
      include: { translations: true, colorSlots: true },
    })
    const productById = new Map(products.map((p) => [p.id, p]))
    const colors = await prisma.color.findMany()

    const orderItems: {
      productId: string
      name: string
      quantity: number
      unitPriceCents: number
      colorSelection: Record<string, string>
    }[] = []

    for (const item of input.items) {
      const product = productById.get(item.productId)
      if (!product) throw badRequest(`Product not available: ${item.productId}`)
      const resolution = resolveColorSelection(
        product.colorSlots.map((s) => ({ slot: s.slot as ColorZoneSlot, defaultColorId: s.defaultColorId })),
        item.colorSelection,
        colors,
      )
      if (!resolution.ok) {
        throw badRequest('Invalid color selection', resolution.errors)
      }
      orderItems.push({
        productId: product.id,
        name: productName(product.translations, input.locale),
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        colorSelection: resolution.resolved ?? {},
      })
    }

    const totals = calcCartTotals(orderItems)
    const orderNumber = generateOrderNumber()
    const accessToken = randomToken()
    const initialStatus =
      input.paymentMethod === 'bank_transfer' ? 'awaiting_bank_transfer' : 'awaiting_payment'

    const order = await prisma.order.create({
      data: {
        orderNumber,
        accessToken,
        status: initialStatus,
        locale: input.locale,
        email: input.address.email,
        firstName: input.address.firstName,
        lastName: input.address.lastName,
        company: input.address.company,
        street: input.address.street,
        zip: input.address.zip,
        city: input.address.city,
        country: input.address.country,
        phone: input.address.phone,
        note: input.note,
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        items: { create: orderItems },
      },
      include: { items: true },
    })

    let paymentResponse: Record<string, unknown>
    if (input.paymentMethod === 'stripe') {
      const session = await createStripeCheckoutSession({
        orderNumber,
        accessToken,
        amountCents: totals.totalCents,
        email: order.email,
        locale: order.locale,
        description: `Bestellung ${orderNumber}`,
      })
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'stripe',
          status: 'pending',
          amountCents: totals.totalCents,
          stripeSessionId: session.sessionId,
        },
      })
      paymentResponse = { method: 'stripe', redirectUrl: session.url }
    } else if (input.paymentMethod === 'bank_transfer') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'bank_transfer',
          status: 'pending',
          amountCents: totals.totalCents,
          reference: orderNumber,
        },
      })
      paymentResponse = {
        method: 'bank_transfer',
        bank: {
          accountHolder: env.BANK_ACCOUNT_HOLDER,
          iban: env.BANK_IBAN,
          bic: env.BANK_BIC,
          reference: orderNumber,
          amountCents: totals.totalCents,
        },
      }
    } else {
      // bitcoin
      const address = await bitcoinProvider.createReceiveAddress()
      const expectedSats = await bitcoinProvider.convertEurCentsToSats(totals.totalCents)
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'bitcoin',
          status: 'pending',
          amountCents: totals.totalCents,
          bitcoinPayment: {
            create: {
              address,
              expectedSats,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        },
        include: { bitcoinPayment: true },
      })
      paymentResponse = {
        method: 'bitcoin',
        paymentId: payment.id,
        address,
        expectedSats: Number(expectedSats),
        requiredConfirmations: env.BITCOIN_REQUIRED_CONFIRMATIONS,
        expiresAt: payment.bitcoinPayment?.expiresAt,
      }
    }

    await sendOrderConfirmation(order.id)
    await sendEmail(
      env.ADMIN_NOTIFICATION_EMAIL,
      'admin_notification',
      renderAdminNotification(
        {
          event: 'Neue Bestellung',
          detail: `${orderNumber} — ${(totals.totalCents / 100).toFixed(2)} € (${input.paymentMethod})`,
          adminUrl: `${env.WEB_URL}/admin/orders`,
        },
        'de',
      ),
    )

    res.status(201).json({
      orderNumber,
      accessToken,
      totals,
      payment: paymentResponse,
    })
  } catch (err) {
    next(err)
  }
})
