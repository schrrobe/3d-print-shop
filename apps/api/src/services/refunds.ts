import { canTransitionOrder } from '@print-shop/utils'
import { Prisma, type Order, type Payment, type Refund, type RefundProvider } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { badRequest, notFound } from '../middleware/error.js'
import {
  createInvoiceCorrection,
  generateInvoiceCorrectionPdf,
  sendInvoiceCorrectionEmail,
} from './invoice-correction.js'
import { refundPaypalCapture } from './payments/paypal.js'
import {
  createStripeRefund,
  stripeConfigured,
  stripePaymentIntentForSession,
} from './payments/stripe.js'
import { emitRefund } from './tracking/events.js'

/**
 * Erstattungen (GLOSSARY.md). Partial and multiple refunds per payment; the
 * sum of pending + succeeded refunds never exceeds the paid amount. Every
 * transition to `succeeded` ends in {@link onRefundSucceeded} (correction,
 * email, full-refund status), which is idempotent so webhook retries heal
 * partial failures.
 */

type RefundStatus = Refund['status']

export function refundProviderFor(method: Payment['method']): RefundProvider {
  if (method === 'stripe' || method === 'stripe_payment_link') return 'stripe'
  if (method === 'paypal') return 'paypal'
  return 'manual'
}

/** The order's refundable payment: the paid one (stays `paid` while partially refunded). */
function refundablePayment<P extends Pick<Payment, 'status'>>(payments: P[]): P | undefined {
  return payments.find((p) => p.status === 'paid')
}

/** Sum of refunds that hold money (pending + succeeded) — what can no longer be refunded. */
async function committedCents(
  db: Pick<Prisma.TransactionClient, 'refund'>,
  paymentId: string,
): Promise<number> {
  const agg = await db.refund.aggregate({
    where: { paymentId, status: { in: ['pending', 'succeeded'] } },
    _sum: { amountCents: true },
  })
  return agg._sum.amountCents ?? 0
}

export async function getOrderRefunds(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      invoice: { select: { id: true, number: true } },
      payments: {
        select: {
          id: true,
          method: true,
          status: true,
          amountCents: true,
          refunds: {
            orderBy: { createdAt: 'desc' },
            include: {
              invoiceCorrection: { select: { id: true, number: true, sentAt: true } },
              createdBy: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!order) throw notFound('Order not found')
  const payment = refundablePayment(order.payments)
  const refunds = order.payments.flatMap((p) =>
    p.refunds.map((r) => ({ ...r, paymentMethod: p.method })),
  )
  const committed = refunds
    .filter((r) => payment && r.paymentId === payment.id && r.status !== 'failed')
    .reduce((sum, r) => sum + r.amountCents, 0)
  return {
    refunds,
    hasInvoice: order.invoice !== null,
    payment: payment
      ? { id: payment.id, method: payment.method, amountCents: payment.amountCents }
      : null,
    provider: payment ? refundProviderFor(payment.method) : null,
    refundableCents: payment ? Math.max(0, payment.amountCents - committed) : 0,
  }
}

export interface CreateRefundInput {
  orderId: string
  /** Exact amount, or `full` for the whole remaining refundable amount. */
  amountCents?: number
  full?: boolean
  reason: string
  complaintId?: string
  adminUserId: string | null
  /** Bank transfer / bitcoin: the admin already paid the money back. */
  confirmManual?: boolean
  /** "Stornieren & erstatten": only for orders still in `paid`. */
  requireStatus?: 'paid'
}

/**
 * Refunds (part of) an order's paid payment through its provider (Stripe,
 * PayPal) or records a manual refund. Provider errors don't throw: the refund
 * ends `failed` with a failureReason so the admin sees it and can retry.
 */
export async function createRefund(input: CreateRefundInput): Promise<Refund> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { invoice: { select: { id: true } }, payments: true },
  })
  if (!order) throw notFound('Order not found')
  if (input.requireStatus && order.status !== input.requireStatus) {
    throw badRequest(
      'Nur bezahlte Bestellungen, die noch nicht in Produktion sind, können storniert werden',
    )
  }
  if (!order.invoice) throw badRequest('Rechnung zuerst erzeugen')
  const payment = refundablePayment(order.payments)
  if (!payment) throw badRequest('Keine bezahlte Zahlung zu dieser Bestellung')
  const provider = refundProviderFor(payment.method)
  if (provider === 'manual' && !input.confirmManual) {
    throw badRequest('Bitte bestätigen, dass der Betrag bereits zurücküberwiesen wurde')
  }
  if (input.complaintId) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: input.complaintId },
      select: { orderId: true },
    })
    if (complaint?.orderId !== order.id)
      throw badRequest('Reklamation gehört nicht zu dieser Bestellung')
  }

  // Row lock on the payment serializes concurrent refunds, so the remaining
  // amount read here cannot be spent twice.
  const refund = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`
    const remaining = payment.amountCents - (await committedCents(tx, payment.id))
    const amountCents = input.full ? remaining : (input.amountCents ?? 0)
    if (remaining <= 0) throw badRequest('Die Zahlung ist bereits vollständig erstattet')
    if (amountCents <= 0 || amountCents > remaining) {
      throw badRequest(`Betrag übersteigt den erstattbaren Rest (${remaining} Cent)`)
    }
    return tx.refund.create({
      data: {
        paymentId: payment.id,
        amountCents,
        provider,
        status: provider === 'manual' ? 'succeeded' : 'pending',
        reason: input.reason,
        complaintId: input.complaintId ?? null,
        createdById: input.adminUserId,
      },
    })
  })

  if (provider === 'manual') {
    await runSucceededHooks(refund.id)
    return refund
  }

  let result: { id: string; status: RefundStatus; failureReason?: string | null }
  try {
    result =
      provider === 'stripe'
        ? await createStripeRefund({
            paymentIntentId: await paymentIntentOf(payment),
            amountCents: refund.amountCents,
            idempotencyKey: refund.id,
          })
        : await refundPaypalCapture({
            captureId: requirePaypalCapture(payment),
            amountCents: refund.amountCents,
            requestId: refund.id,
          })
  } catch (err) {
    console.error(`[refund] ${provider} refund ${refund.id} failed:`, err)
    return prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'failed', failureReason: err instanceof Error ? err.message : String(err) },
    })
  }

  // A webhook may have claimed the row first; never move a settled refund back.
  await prisma.refund.updateMany({
    where: { id: refund.id, status: 'pending' },
    data: {
      providerRefundId: result.id,
      status: result.status,
      failureReason: result.status === 'failed' ? (result.failureReason ?? 'failed') : null,
    },
  })
  const saved = await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } })
  if (saved.status === 'succeeded') await runSucceededHooks(saved.id)
  return saved
}

/** Money already moved: follow-up failures are logged, a retry (webhook, resend) heals them. */
async function runSucceededHooks(refundId: string): Promise<void> {
  try {
    await onRefundSucceeded(refundId)
  } catch (err) {
    console.error(`[refund] follow-up for ${refundId} failed:`, err)
  }
}

function requirePaypalCapture(payment: Payment): string {
  if (!payment.paypalCaptureId) throw new Error('Payment has no PayPal capture')
  return payment.paypalCaptureId
}

/** Stripe PaymentIntent; legacy rows are resolved once via their Checkout Session and persisted. */
async function paymentIntentOf(payment: Payment): Promise<string | null> {
  if (payment.stripePaymentIntentId || !stripeConfigured) return payment.stripePaymentIntentId
  // `reference` holds the claimed session id; for payment links stripeSessionId is the link.
  const sessionId = payment.reference ?? payment.stripeSessionId
  if (!sessionId) throw new Error('Payment has no Stripe Checkout Session')
  const pi = await stripePaymentIntentForSession(sessionId)
  await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentIntentId: pi } })
  return pi
}

/**
 * Side effects of a succeeded refund, safe to run any number of times:
 * full refund → payment/order `refunded`, open print jobs cancelled, tracking
 * `refund` (once per order); then Rechnungskorrektur (+PDF) and customer email.
 */
export async function onRefundSucceeded(refundId: string): Promise<void> {
  const refund = await prisma.refund.findUniqueOrThrow({
    where: { id: refundId },
    include: {
      invoiceCorrection: true,
      payment: { include: { order: { include: { invoice: true } } } },
    },
  })
  if (refund.status !== 'succeeded') return
  const { payment } = refund
  const order = payment.order

  const refundedCents =
    (
      await prisma.refund.aggregate({
        where: { paymentId: payment.id, status: 'succeeded' },
        _sum: { amountCents: true },
      })
    )._sum.amountCents ?? 0
  if (refundedCents >= payment.amountCents) await finalizeFullRefund(payment.id, order)

  if (!order.invoice) {
    console.error(
      `[refund] ${refund.id}: order ${order.orderNumber} has no invoice, no correction issued`,
    )
    return
  }
  const correction =
    refund.invoiceCorrection ??
    (await createInvoiceCorrection({ ...refund, invoice: order.invoice }))
  if (!correction.pdfPath) await generateInvoiceCorrectionPdf(correction.id)
  if (!correction.sentAt) await sendInvoiceCorrectionEmail(correction.id)
}

async function finalizeFullRefund(
  paymentId: string,
  order: Pick<Order, 'id' | 'orderNumber' | 'status' | 'totalCents' | 'trackingSessionId'>,
): Promise<void> {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'paid' },
    data: { status: 'refunded' },
  })
  if (order.status !== 'refunded') {
    if (!canTransitionOrder(order.status, 'refunded')) {
      console.warn(`[refund] order ${order.orderNumber} is ${order.status}, status left unchanged`)
    } else {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: 'refunded' },
        })
        if (claimed.count !== 1) return
        // Not yet started jobs leave the queue; a running print is left to the operator.
        const open = await tx.printerJob.findMany({
          where: { orderId: order.id, status: { in: ['waiting', 'assigned'] } },
          select: { id: true, printerId: true },
        })
        if (open.length === 0) return
        await tx.printerJob.updateMany({
          where: { id: { in: open.map((j) => j.id) } },
          data: { status: 'failed', finishedAt: new Date(), printerId: null },
        })
        const printerIds = open.flatMap((j) => (j.printerId ? [j.printerId] : []))
        if (printerIds.length) {
          await tx.printer.updateMany({
            where: { id: { in: printerIds } },
            data: { status: 'idle' },
          })
        }
      })
    }
  }
  // Event id is unique per order: re-runs never record a second refund.
  try {
    await emitRefund(prisma, order)
  } catch (err) {
    console.error('[tracking] refund emit failed:', err)
  }
}

export interface SyncProviderRefundInput {
  provider: 'stripe' | 'paypal'
  payment: { stripePaymentIntentId?: string; paypalCaptureId?: string }
  providerRefundId: string
  amountCents: number
  status: RefundStatus
  failureReason?: string | null
}

/**
 * Provider webhook → local Refund. Known refunds advance pending → succeeded /
 * failed; refunds made in the Stripe/PayPal dashboard are imported. Our own
 * just-created refund (provider id not stored yet) is matched by amount.
 */
export async function syncProviderRefund(input: SyncProviderRefundInput): Promise<void> {
  const where =
    input.provider === 'stripe'
      ? input.payment.stripePaymentIntentId && {
          stripePaymentIntentId: input.payment.stripePaymentIntentId,
        }
      : input.payment.paypalCaptureId && { paypalCaptureId: input.payment.paypalCaptureId }
  const payment = where ? await prisma.payment.findFirst({ where }) : null
  if (!payment) {
    console.warn(
      `[refund] ${input.provider} refund ${input.providerRefundId}: unknown payment, ignored`,
    )
    return
  }
  const failureReason = input.status === 'failed' ? (input.failureReason ?? 'failed') : null

  let refund = await prisma.refund.findUnique({
    where: { providerRefundId: input.providerRefundId },
  })
  if (!refund) {
    const own = await prisma.refund.findFirst({
      where: {
        paymentId: payment.id,
        provider: input.provider,
        providerRefundId: null,
        status: 'pending',
        amountCents: input.amountCents,
      },
      orderBy: { createdAt: 'asc' },
    })
    if (own) {
      const claimed = await prisma.refund.updateMany({
        where: { id: own.id, providerRefundId: null },
        data: { providerRefundId: input.providerRefundId },
      })
      if (claimed.count === 1) refund = { ...own, providerRefundId: input.providerRefundId }
    }
  }
  if (!refund) {
    try {
      refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountCents: input.amountCents,
          provider: input.provider,
          providerRefundId: input.providerRefundId,
          status: input.status,
          failureReason,
          reason: 'Im Anbieter-Dashboard erstellt',
        },
      })
    } catch (err) {
      // Concurrent delivery of the same refund (charge.refunded + refund.created).
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err
      refund = await prisma.refund.findUniqueOrThrow({
        where: { providerRefundId: input.providerRefundId },
      })
    }
  }

  if (refund.status === 'pending' && input.status !== 'pending') {
    await prisma.refund.updateMany({
      where: { id: refund.id, status: 'pending' },
      data: { status: input.status, failureReason },
    })
  } else if (refund.status === 'succeeded' && input.status === 'failed') {
    // ponytail: a reversed refund is only logged; the correction stays issued — handle manually.
    console.error(`[refund] ${refund.id} failed after succeeding: ${failureReason}`)
  }
  // Also re-run for already succeeded refunds: webhook retries heal partial failures.
  await onRefundSucceeded(refund.id)
}
