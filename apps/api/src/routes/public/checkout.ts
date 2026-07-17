import { Prisma, type Voucher } from '@prisma/client'
import { renderAdminNotification } from '@print-shop/emails'
import type { ColorZoneSlot, Locale } from '@print-shop/types'
import {
  calcCartTotalsWithVoucher,
  checkVoucher,
  isFreeShipping,
  normalizeVoucherCode,
  resolveColorSelection,
} from '@print-shop/utils'
import { checkoutIdempotencyKeySchema, checkoutSchema, uuidSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { ApiError, badRequest, conflict } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { sendEmail } from '../../services/email.js'
import { sendOrderConfirmation } from '../../services/order-flow.js'
import { bitcoinProvider } from '../../services/payments/bitcoin.js'
import { createStripeCheckoutSession } from '../../services/payments/stripe.js'
import { emitOrderCreated } from '../../services/tracking/events.js'

export const checkoutRouter = Router()

/**
 * Link the order to its tracker session. If the ingest endpoint has not yet
 * persisted the session (deep link straight to checkout / slow network racing
 * the meta batch), upsert a placeholder row (landingPath '') so the FK link
 * survives. recordClientBatch promotes that placeholder to the real touchpoint
 * when the meta batch lands — which is well before payment-time attribution.
 * Best-effort: a tracking failure must never break checkout.
 */
async function resolveTrackingSessionId(value: string | undefined): Promise<string | null> {
  if (!value || !uuidSchema.safeParse(value).success) return null
  try {
    await prisma.trackingSession.createMany({
      data: [{ id: value, landingPath: '' }],
      skipDuplicates: true,
    })
    return value
  } catch (err) {
    console.error('[tracking] session placeholder upsert failed:', err)
    return null
  }
}

function productName(translations: { locale: string; name: string }[], locale: Locale): string {
  return (
    translations.find((t) => t.locale === locale)?.name ??
    translations.find((t) => t.locale === 'de')?.name ??
    translations[0]?.name ??
    'Product'
  )
}

const checkoutOrderInclude = {
  items: true,
  payments: { include: { bitcoinPayment: true } },
} as const

function checkoutResponse(order: Prisma.OrderGetPayload<{ include: typeof checkoutOrderInclude }>) {
  const payment = order.payments[0]
  if (!payment) throw new Error(`No payment found for order ${order.orderNumber}`)

  let paymentResponse: Record<string, unknown>
  if (payment.method === 'stripe') {
    if (!payment.stripePaymentLinkUrl) throw new Error('Stripe checkout URL is missing')
    paymentResponse = { method: 'stripe', redirectUrl: payment.stripePaymentLinkUrl }
  } else if (payment.method === 'bank_transfer') {
    paymentResponse = {
      method: 'bank_transfer',
      bank: {
        accountHolder: env.BANK_ACCOUNT_HOLDER,
        iban: env.BANK_IBAN,
        bic: env.BANK_BIC,
        reference: payment.reference ?? order.orderNumber,
        amountCents: payment.amountCents,
      },
    }
  } else if (payment.method === 'bitcoin' && payment.bitcoinPayment) {
    paymentResponse = {
      method: 'bitcoin',
      paymentId: payment.id,
      address: payment.bitcoinPayment.address,
      expectedSats: Number(payment.bitcoinPayment.expectedSats),
      requiredConfirmations: env.BITCOIN_REQUIRED_CONFIRMATIONS,
      expiresAt: payment.bitcoinPayment.expiresAt,
    }
  } else {
    throw new Error(`Unsupported checkout payment state: ${payment.method}`)
  }

  return {
    orderNumber: order.orderNumber,
    accessToken: order.accessToken,
    totals: {
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      freeShippingApplied: isFreeShipping(order.subtotalCents),
    },
    payment: paymentResponse,
  }
}

checkoutRouter.post('/', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body)
    const checkoutKey = checkoutIdempotencyKeySchema.parse(req.get('idempotency-key'))
    const trackingSessionId = await resolveTrackingSessionId(
      req.get('x-tracking-session') ?? undefined,
    )
    if (input.paymentMethod === 'stripe_payment_link') {
      throw badRequest('stripe_payment_link is reserved for quotes')
    }
    if (input.paymentMethod === 'bitcoin' && !env.BITCOIN_ENABLED) {
      throw badRequest('Bitcoin payments are not enabled')
    }

    const previous = await prisma.order.findUnique({
      where: { checkoutKey },
      include: checkoutOrderInclude,
    })
    if (previous) {
      res.json(checkoutResponse(previous))
      return
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
        product.colorSlots.map((s) => ({
          slot: s.slot as ColorZoneSlot,
          defaultColorId: s.defaultColorId,
        })),
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

    // Hard revalidation of the voucher — the cart's validate result may be stale.
    let voucher: Voucher | null = null
    if (input.voucherCode) {
      voucher = await prisma.voucher.findUnique({
        where: { code: normalizeVoucherCode(input.voucherCode) },
      })
      const subtotalCents = orderItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0)
      const check = checkVoucher(voucher, subtotalCents)
      if (!check.ok) {
        if (check.reason === 'exhausted') {
          throw conflict('Gutschein ist nicht mehr verfügbar', { voucherRejection: check.reason })
        }
        throw badRequest('Gutschein ist nicht einlösbar', { voucherRejection: check.reason })
      }
    }

    const totals = calcCartTotalsWithVoucher(orderItems, voucher)
    const orderNumber = generateOrderNumber()
    const accessToken = randomToken()
    const initialStatus =
      input.paymentMethod === 'bank_transfer' ? 'awaiting_bank_transfer' : 'awaiting_payment'

    let paymentData: Prisma.PaymentCreateWithoutOrderInput
    if (input.paymentMethod === 'stripe') {
      const session = await createStripeCheckoutSession({
        orderNumber,
        accessToken,
        amountCents: totals.totalCents,
        email: input.address.email,
        locale: input.locale,
        description: `Bestellung ${orderNumber}`,
      })
      paymentData = {
        method: 'stripe',
        status: 'pending',
        amountCents: totals.totalCents,
        stripeSessionId: session.sessionId,
        stripePaymentLinkUrl: session.url,
      }
    } else if (input.paymentMethod === 'bank_transfer') {
      paymentData = {
        method: 'bank_transfer',
        status: 'pending',
        amountCents: totals.totalCents,
        reference: orderNumber,
      }
    } else {
      const address = await bitcoinProvider.createReceiveAddress()
      const expectedSats = await bitcoinProvider.convertEurCentsToSats(totals.totalCents)
      paymentData = {
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
      }
    }

    let created = true
    let order: Prisma.OrderGetPayload<{ include: typeof checkoutOrderInclude }>
    try {
      order = await prisma.$transaction(async (tx) => {
        if (voucher) {
          const redeemed = await tx.voucher.updateMany({
            where: {
              id: voucher.id,
              active: true,
              ...(voucher.maxRedemptions != null
                ? { redemptionCount: { lt: voucher.maxRedemptions } }
                : {}),
            },
            data: { redemptionCount: { increment: 1 } },
          })
          if (redeemed.count === 0) {
            throw conflict('Gutschein ist nicht mehr verfügbar', { voucherRejection: 'exhausted' })
          }
        }
        return tx.order.create({
          data: {
            orderNumber,
            accessToken,
            checkoutKey,
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
            discountCents: totals.discountCents,
            totalCents: totals.totalCents,
            voucherId: voucher?.id,
            voucherCode: voucher?.code,
            trackingSessionId,
            items: { create: orderItems },
            payments: { create: paymentData },
          },
          include: checkoutOrderInclude,
        })
      })
    } catch (err) {
      // A concurrent request sharing this checkoutKey can lose the unique-order
      // race (P2002) or exhaust the voucher first (conflict, 409). Both mean an
      // order for this key already exists, so resolve idempotently to it.
      const isConcurrent =
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
        (err instanceof ApiError && err.status === 409)
      if (!isConcurrent) throw err
      const concurrent = await prisma.order.findUnique({
        where: { checkoutKey },
        include: checkoutOrderInclude,
      })
      if (!concurrent) throw err
      created = false
      order = concurrent
    }

    if (created) {
      // Tracking is best-effort — a failure here must never break checkout.
      // The session row is already resolved/created above, so skip the re-lookup.
      try {
        await emitOrderCreated(prisma, order, true)
      } catch (err) {
        console.error('[tracking] emitOrderCreated failed:', err)
      }
      await sendOrderConfirmation(order.id)
      await sendEmail(
        env.ADMIN_NOTIFICATION_EMAIL,
        'admin_notification',
        renderAdminNotification(
          {
            event: 'Neue Bestellung',
            detail: `${order.orderNumber} — ${(order.totalCents / 100).toFixed(2)} € (${input.paymentMethod})`,
            adminUrl: `${env.WEB_URL}/admin/orders`,
          },
          'de',
        ),
      )
    }

    res.status(created ? 201 : 200).json(checkoutResponse(order))
  } catch (err) {
    next(err)
  }
})
