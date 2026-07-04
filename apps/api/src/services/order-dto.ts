import type { BitcoinPayment, Invoice, Order, OrderItem, Payment, PrinterJob } from '@prisma/client'
import { env } from '../env.js'

type OrderForDto = Order & {
  items: OrderItem[]
  payments: (Payment & { bitcoinPayment: BitcoinPayment | null })[]
  invoice: Pick<Invoice, 'number' | 'issuedAt'> | null
}

/**
 * Public order DTO — shared by the guest order page and the customer portal so
 * the two responses never drift. Exposes no internal ids beyond payment ids
 * (needed for polling) and never the access token.
 */
export function publicOrderDto(order: OrderForDto) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    locale: order.locale,
    createdAt: order.createdAt,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      colorSelection: i.colorSelection,
    })),
    invoice: order.invoice,
    payments: order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amountCents: p.amountCents,
      reference: p.reference,
      bank:
        p.method === 'bank_transfer'
          ? {
              accountHolder: env.BANK_ACCOUNT_HOLDER,
              iban: env.BANK_IBAN,
              bic: env.BANK_BIC,
              reference: p.reference ?? order.orderNumber,
            }
          : undefined,
      bitcoin: p.bitcoinPayment
        ? {
            address: p.bitcoinPayment.address,
            expectedSats: Number(p.bitcoinPayment.expectedSats),
            receivedSats: Number(p.bitcoinPayment.receivedSats),
            confirmations: p.bitcoinPayment.confirmations,
            status: p.bitcoinPayment.status,
            requiredConfirmations: env.BITCOIN_REQUIRED_CONFIRMATIONS,
          }
        : undefined,
    })),
  }
}

/** Coarse production summary for the portal (no printer/internal details). */
export function productionSummary(jobs: Pick<PrinterJob, 'status'>[]) {
  const byStatus: Record<string, number> = {}
  for (const job of jobs) byStatus[job.status] = (byStatus[job.status] ?? 0) + 1
  return { total: jobs.length, byStatus }
}
