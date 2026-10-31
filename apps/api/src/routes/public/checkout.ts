import { Prisma, type Voucher } from '@prisma/client'
import { renderAdminNotification } from '@print-shop/emails'
import type { ColorZoneSlot, Locale } from '@print-shop/types'
import {
  calcCartTotalsWithVoucher,
  calcPrepaymentDiscountCents,
  checkVoucher,
  FREE_BOX_CAPACITY,
  isFreeShipping,
  labeledItemName,
  normalizeVoucherCode,
  personalizedItemName,
  personalizedUnitPriceCents,
  qualifiesForFreeBox,
  resolveColorSelection,
} from '@print-shop/utils'
import { checkoutIdempotencyKeySchema, checkoutSchema, uuidSchema } from '@print-shop/validators'
import { Router } from 'express'
import { env } from '../../env.js'
import { prisma } from '../../lib/prisma.js'
import { generateOrderNumber, randomToken } from '../../lib/tokens.js'
import { ApiError, badRequest, conflict } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'
import { assertCompanyComplete, company } from '../../services/company.js'
import { sendEmail } from '../../services/email.js'
import { issuePrepaymentInvoice, sendOrderConfirmation } from '../../services/order-flow.js'
import { bitcoinProvider } from '../../services/payments/bitcoin.js'
import {
  createStripeCheckoutSession,
  getStripeClientSecret,
} from '../../services/payments/stripe.js'
import { REF_COOKIE, attributeSalesChannel, commissionFor } from '../../services/sales-channels.js'
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

type CheckoutOrder = Prisma.OrderGetPayload<{ include: typeof checkoutOrderInclude }>

/**
 * Vorkasse invoice at checkout (idempotent). The order stands even if this
 * fails: a checkout replay retries it, and markOrderPaid mails it on payment.
 * Returns the reloaded order — the payment reference is now the invoice number.
 */
async function issuePrepaymentInvoiceSafely(order: CheckoutOrder): Promise<CheckoutOrder> {
  try {
    await issuePrepaymentInvoice(order.id)
  } catch (err) {
    console.error(`[invoice] prepayment invoice failed for ${order.orderNumber}:`, err)
  }
  return prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: checkoutOrderInclude,
  })
}

async function checkoutResponse(order: CheckoutOrder, stripeClientSecret?: string) {
  const payment = order.payments[0]
  if (!payment) throw new Error(`No payment found for order ${order.orderNumber}`)

  let paymentResponse: Record<string, unknown>
  if (payment.method === 'stripe') {
    if (payment.stripePaymentLinkUrl) {
      // Mock mode (and hosted sessions from before embedded checkout)
      paymentResponse = { method: 'stripe', redirectUrl: payment.stripePaymentLinkUrl }
    } else {
      if (!payment.stripeSessionId) throw new Error('Stripe session is missing')
      paymentResponse = {
        method: 'stripe',
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        clientSecret: stripeClientSecret ?? (await getStripeClientSecret(payment.stripeSessionId)),
      }
    }
  } else if (payment.method === 'bank_transfer') {
    paymentResponse = {
      method: 'bank_transfer',
      bank: {
        accountHolder: company().accountHolder,
        iban: company().iban,
        bic: company().bic,
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
      prepaymentDiscountCents: order.prepaymentDiscountCents,
      totalCents: order.totalCents,
      freeShippingApplied: isFreeShipping(order.subtotalCents, order.country),
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
      // A replay finishes a Vorkasse invoice whose issuance failed the first time.
      const replayed =
        previous.status === 'awaiting_bank_transfer'
          ? await issuePrepaymentInvoiceSafely(previous)
          : previous
      res.json(await checkoutResponse(replayed))
      return
    }
    assertCompanyComplete()

    const freeBox = input.freeBox
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: [...input.items.map((i) => i.productId), ...(freeBox ? [freeBox.productId] : [])],
        },
        active: true,
      },
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
      personalization?: string
    }[] = []

    // The free box is a 0 € line so production, shipping and complaints see it like any item.
    const lines = freeBox ? [...input.items, { ...freeBox, quantity: 1, free: true }] : input.items
    for (const item of lines) {
      const product = productById.get(item.productId)
      if (!product) throw badRequest(`Product not available: ${item.productId}`)
      const free = 'free' in item
      if (free && product.capacity !== FREE_BOX_CAPACITY) {
        throw badRequest(`Free box must hold ${FREE_BOX_CAPACITY} rounds`)
      }
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
      const personalization = 'personalization' in item ? item.personalization : undefined
      const labelText = 'labelText' in item ? item.labelText : undefined
      orderItems.push({
        productId: product.id,
        name: personalizedItemName(
          labeledItemName(productName(product.translations, input.locale), labelText, input.locale),
          personalization,
          input.locale,
        ),
        quantity: item.quantity,
        unitPriceCents: free ? 0 : personalizedUnitPriceCents(product.priceCents, personalization),
        colorSelection: resolution.resolved ?? {},
        personalization,
      })
    }
    // Paid items only — the free box itself is 0 € and never counts toward the threshold.
    const subtotalCents = orderItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0)
    if (freeBox && !qualifiesForFreeBox(subtotalCents)) {
      throw badRequest('Order value too low for the free box')
    }

    // Hard revalidation of the voucher — the cart's validate result may be stale.
    let voucher: Voucher | null = null
    if (input.voucherCode) {
      voucher = await prisma.voucher.findUnique({
        where: { code: normalizeVoucherCode(input.voucherCode) },
      })
      const check = checkVoucher(voucher, subtotalCents)
      if (!check.ok) {
        if (check.reason === 'exhausted') {
          throw conflict('Gutschein ist nicht mehr verfügbar', { voucherRejection: check.reason })
        }
        throw badRequest('Gutschein ist nicht einlösbar', { voucherRejection: check.reason })
      }
    }

    const voucherTotals = calcCartTotalsWithVoucher(orderItems, voucher, input.address.country)
    const prepaymentDiscountCents =
      input.paymentMethod === 'bank_transfer' ? calcPrepaymentDiscountCents(voucherTotals) : 0
    const totals = {
      ...voucherTotals,
      totalCents: voucherTotals.totalCents - prepaymentDiscountCents,
    }
    // Commission base = goods after voucher and Vorkasse discount, without shipping; frozen on the order.
    const salesChannel = await attributeSalesChannel(
      prisma,
      voucher?.id ?? null,
      (req.cookies as Record<string, string> | undefined)?.[REF_COOKIE],
      new Date(),
    )
    const commissionBaseCents =
      totals.subtotalCents - totals.discountCents - prepaymentDiscountCents
    const orderNumber = generateOrderNumber()
    const accessToken = randomToken()
    const initialStatus =
      input.paymentMethod === 'bank_transfer' ? 'awaiting_bank_transfer' : 'awaiting_payment'

    let paymentData: Prisma.PaymentCreateWithoutOrderInput
    let stripeClientSecret: string | undefined
    if (input.paymentMethod === 'stripe') {
      const session = await createStripeCheckoutSession({
        orderNumber,
        accessToken,
        amountCents: totals.totalCents,
        email: input.address.email,
        locale: input.locale,
        description: `Bestellung ${orderNumber}`,
      })
      stripeClientSecret = session.clientSecret
      paymentData = {
        method: 'stripe',
        status: 'pending',
        amountCents: totals.totalCents,
        stripeSessionId: session.sessionId,
        stripePaymentLinkUrl: session.url ?? null,
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
    let order: CheckoutOrder
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
            prepaymentDiscountCents,
            totalCents: totals.totalCents,
            voucherId: voucher?.id,
            voucherCode: voucher?.code,
            trackingSessionId,
            // Conversion-API match data — only with marketing consent; cleared on purchase enqueue.
            trackingAttribution: input.consent?.marketing
              ? { ...input.attribution, ip: req.ip, userAgent: req.get('user-agent') }
              : undefined,
            salesChannelId: salesChannel?.id,
            commissionBaseCents: salesChannel ? commissionBaseCents : null,
            commissionCents: salesChannel ? commissionFor(salesChannel, commissionBaseCents) : null,
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
        await emitOrderCreated(prisma, order, true, input.consent)
      } catch (err) {
        console.error('[tracking] emitOrderCreated failed:', err)
      }
      await sendOrderConfirmation(order.id)
      if (order.payments[0]?.method === 'bank_transfer') {
        order = await issuePrepaymentInvoiceSafely(order)
      }
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

    res
      .status(created ? 201 : 200)
      .json(await checkoutResponse(order, created ? stripeClientSecret : undefined))
  } catch (err) {
    next(err)
  }
})
