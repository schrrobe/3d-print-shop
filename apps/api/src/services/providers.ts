import { renderProviderOrder, renderProviderOrderCancelled } from '@print-shop/emails'
import { formatCents } from '@print-shop/utils'
import type { ProviderAssignInput } from '@print-shop/validators'
import { Prisma, type ProductionStatus } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { prisma } from '../lib/prisma.js'
import { conflict, notFound } from '../middleware/error.js'
import { company } from './company.js'
import { sendEmail } from './email.js'
import { itemColorResolver } from './item-colors.js'
import { notifyProductionStarted } from './order-flow.js'
import { commissionFor } from './sales-channels.js'

/** Same goods value as sales-channel commission: after voucher + Vorkasse discount, no shipping. */
export function goodsValueCents(o: {
  subtotalCents: number
  discountCents: number
  prepaymentDiscountCents: number
}): number {
  return Math.max(0, o.subtotalCents - o.discountCents - o.prepaymentDiscountCents)
}

export const payoutFor = (rateBp: number, baseCents: number) =>
  commissionFor({ commissionType: 'percent', commissionValue: rateBp }, baseCents)

/** Jobs in these states are (being) printed in-house; the order can't go external any more. */
const IN_HOUSE_STARTED: ProductionStatus[] = [
  'printing',
  'printed',
  'quality_check',
  'ready_to_ship',
  'shipped',
]

/**
 * Print jobs of orders held by a provider stay out of the internal queue until
 * the goods are back (received) or the provider ships directly (completed).
 */
export const notHeldExternally: Prisma.PrinterJobWhereInput = {
  NOT: {
    order: {
      providerAssignments: {
        some: { OR: [{ status: 'assigned' }, { status: 'completed', shareCustomerData: false }] },
      },
    },
  },
}

export async function isHeldExternally(orderId: string): Promise<boolean> {
  const held = await prisma.providerAssignment.count({
    where: {
      orderId,
      OR: [{ status: 'assigned' }, { status: 'completed', shareCustomerData: false }],
    },
  })
  return held > 0
}

const assignmentInclude = {
  provider: true,
  order: { include: { items: true } },
} as const
type FullAssignment = Prisma.ProviderAssignmentGetPayload<{ include: typeof assignmentInclude }>

/** Delivery block: customer name + address only for direct shipping, else the shop. */
export function deliveryLines(
  a: { shareCustomerData: boolean },
  order: Pick<
    FullAssignment['order'],
    'firstName' | 'lastName' | 'company' | 'street' | 'zip' | 'city' | 'country'
  >,
  shop: { name: string; street: string; zip: string; city: string },
): string[] {
  if (!a.shareCustomerData)
    return [`Lieferung an: ${shop.name}, ${shop.street}, ${shop.zip} ${shop.city}`]
  return [
    'Direktversand an:',
    `${order.firstName} ${order.lastName}`,
    ...(order.company ? [order.company] : []),
    order.street,
    `${order.zip} ${order.city}, ${order.country}`,
  ]
}

// ponytail: standard Helvetica (WinAnsi) like invoices; names outside Latin-1 (e.g. Ł) need an embedded TTF.
/** A4 production order; rendered on demand, never stored (may contain customer address). */
export async function renderProviderPdf(a: FullAssignment): Promise<Buffer> {
  const { order } = a
  const colorsOf = await itemColorResolver(order.items)
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const c = company()
  doc.fontSize(18).text(c.name)
  doc
    .fontSize(9)
    .fillColor('#5e5e5e')
    .text([c.name, c.street, `${c.zip} ${c.city}`, c.email].join(' · '))
  doc.moveDown(2)
  doc.fillColor('#000000').fontSize(14).text(`Fertigungsauftrag ${order.orderNumber}`)
  doc.fontSize(10)
  doc.text(`Auftragnehmer: ${a.provider.name}`)
  doc.text(`Datum: ${a.createdAt.toLocaleDateString('de-DE')}`)
  doc.moveDown()
  for (const line of deliveryLines(a, order, c)) doc.text(line)
  doc.moveDown(2)

  doc.fontSize(11).text('Positionen', { underline: true })
  doc.moveDown(0.5)
  for (const item of order.items) {
    const line = formatCents(item.unitPriceCents * item.quantity)
    doc
      .fontSize(10)
      .fillColor('#000000')
      .text(`${item.quantity}× ${item.name}  (je ${formatCents(item.unitPriceCents)})  —  ${line}`)
    const details = [
      ...colorsOf(item).map((col) => `${col.label}: ${col.name}`),
      ...(item.personalization ? [`Personalisierung: „${item.personalization}“`] : []),
    ]
    if (details.length)
      doc
        .fontSize(8)
        .fillColor('#5e5e5e')
        .text(`   ${details.join(' · ')}`)
  }
  doc.moveDown()
  doc.fontSize(10).fillColor('#000000')
  const discounts = order.discountCents + order.prepaymentDiscountCents
  doc.text(`Artikelsumme: ${formatCents(order.subtotalCents)}`)
  if (discounts > 0) doc.text(`abzgl. Rabatte: -${formatCents(discounts)}`)
  doc.text(`Warenwert: ${formatCents(a.baseCents)}`)
  doc.text(`Vereinbarter Anteil: ${(a.rateBp / 100).toLocaleString('de-DE')} %`)
  doc.fontSize(12).text(`Vergütung: ${formatCents(a.payoutCents)}`)
  if (a.note) {
    doc.moveDown()
    doc.fontSize(10).text(`Hinweise: ${a.note}`)
  }
  doc.end()
  return done
}

/**
 * Mails the order PDF to the provider; never throws, returns delivery.
 * Re-reads the assignment right before sending so a cancellation that won the
 * race suppresses the (now stale) production order.
 */
export async function sendProviderOrder(assignmentId: string): Promise<boolean> {
  try {
    return await sendProviderOrderUnsafe(assignmentId)
  } catch (err) {
    console.error(`[providers] order email failed for assignment ${assignmentId}:`, err)
    return false
  }
}

async function sendProviderOrderUnsafe(assignmentId: string): Promise<boolean> {
  const a = await prisma.providerAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: assignmentInclude,
  })
  if (a.status === 'cancelled') return false
  const pdf = await renderProviderPdf(a)
  const c = company()
  const delivered = await sendEmail(
    a.provider.email,
    'provider_order',
    renderProviderOrder({
      providerName: a.provider.name,
      contactName: a.provider.contactName,
      orderNumber: a.order.orderNumber,
      payoutCents: a.payoutCents,
      directShipping: a.shareCustomerData,
      note: a.note,
    }),
    [{ filename: `Fertigungsauftrag-${a.order.orderNumber}.pdf`, content: pdf }],
    { replyTo: c.email || undefined, bcc: c.email || undefined },
  )
  if (delivered) {
    await prisma.providerAssignment.update({
      where: { id: a.id },
      data: { emailSentAt: new Date() },
    })
  }
  return delivered
}

/**
 * Hands the whole order to a provider: freezes rate + payout, pulls the jobs
 * out of the internal queue (releasing prepared printers), moves the order
 * to in_production. An open (not yet completed) assignment is cancelled first.
 */
export async function assignOrder(orderId: string, input: ProviderAssignInput) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      printerJobs: true,
      providerAssignments: { where: { status: { not: 'cancelled' } }, include: { provider: true } },
    },
  })
  if (!order) throw notFound('Order not found')
  if (!['paid', 'in_production'].includes(order.status))
    throw conflict('Nur bezahlte Bestellungen (bezahlt / in Produktion) können vergeben werden')
  if (order.printerJobs.some((j) => IN_HOUSE_STARTED.includes(j.status)))
    throw conflict('Ein Druckjob läuft bereits intern – externe Vergabe nicht mehr möglich')
  const previous = order.providerAssignments[0]
  if (previous && previous.status !== 'assigned')
    throw conflict('Der bisherige Anbieter hat bereits fertig gemeldet')

  const provider = await prisma.printProvider.findUnique({ where: { id: input.providerId } })
  if (!provider || !provider.active) throw notFound('Anbieter nicht gefunden oder inaktiv')

  const rateBp = input.rateBp ?? provider.defaultRateBp
  const baseCents = goodsValueCents(order)
  const now = new Date()

  const assignment = await prisma
    .$transaction(async (tx) => {
      if (previous) {
        const cancelled = await tx.providerAssignment.updateMany({
          where: { id: previous.id, status: 'assigned' },
          data: { status: 'cancelled', cancelledAt: now },
        })
        if (cancelled.count !== 1) throw conflict('Der Auftrag wurde zwischenzeitlich geändert')
      }
      const printerIds = order.printerJobs.flatMap((j) =>
        j.status === 'assigned' && j.printerId ? [j.printerId] : [],
      )
      if (printerIds.length) {
        // A printer shared with another order's assigned job stays prepared.
        await tx.printer.updateMany({
          where: {
            id: { in: printerIds },
            status: 'prepared',
            jobs: { none: { status: 'assigned', orderId: { not: order.id } } },
          },
          data: { status: 'idle' },
        })
      }
      await tx.printerJob.updateMany({
        where: { orderId: order.id, status: { notIn: IN_HOUSE_STARTED } },
        data: { status: 'waiting', printerId: null, plannedStartAt: null, plannedEndAt: null },
      })
      // Conditional: a concurrent cancel/refund since the read rolls everything back.
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: { in: ['paid', 'in_production'] } },
        data: { status: 'in_production' },
      })
      if (moved.count !== 1) throw conflict('Die Bestellung wurde zwischenzeitlich geändert')
      return tx.providerAssignment.create({
        data: {
          orderId: order.id,
          providerId: provider.id,
          rateBp,
          baseCents,
          payoutCents: payoutFor(rateBp, baseCents),
          shareCustomerData: input.shareCustomerData,
          note: input.note,
        },
      })
    })
    .catch((err: unknown) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
        throw conflict('Die Bestellung ist bereits vergeben')
      throw err
    })

  // Post-commit side effects must not turn a committed assignment into an error response.
  const cancelEmailSent = previous
    ? await sendProviderCancellation(previous.provider, order.orderNumber)
    : null
  if (order.status === 'paid') {
    try {
      await notifyProductionStarted(order.id)
    } catch (err) {
      console.error(`[providers] production_started mail failed for ${order.orderNumber}:`, err)
    }
  }
  const emailSent = await sendProviderOrder(assignment.id)
  return { assignment, emailSent, cancelEmailSent, cancelledId: previous?.id ?? null }
}

/** Never throws; false = provider not notified (surfaced to the admin, audited). */
async function sendProviderCancellation(
  provider: { email: string; name: string; contactName: string | null },
  orderNumber: string,
): Promise<boolean> {
  return sendEmail(
    provider.email,
    'provider_order_cancelled',
    renderProviderOrderCancelled({
      providerName: provider.name,
      contactName: provider.contactName,
      orderNumber,
    }),
    [],
    { replyTo: company().email || undefined },
  )
}

const NEXT: Record<'completed' | 'received' | 'cancelled', 'assigned' | 'completed'> = {
  completed: 'assigned',
  received: 'completed',
  cancelled: 'assigned',
}

/**
 * completed: direct shipping → jobs ready_to_ship, order ready_to_ship.
 * received (not for direct shipping): jobs + order → quality_check, normal QC follows.
 * cancelled: jobs stay waiting and reappear in the internal queue.
 */
export async function setAssignmentStatus(
  id: string,
  status: 'completed' | 'received' | 'cancelled',
) {
  const a = await prisma.providerAssignment.findUnique({
    where: { id },
    include: { provider: true, order: true },
  })
  if (!a) throw notFound('Auftrag nicht gefunden')
  if (a.status !== NEXT[status])
    throw conflict(`Statuswechsel ${a.status} → ${status} nicht möglich`)
  if (status === 'received' && a.shareCustomerData)
    throw conflict('Direktversand: Ware geht nicht über dich')

  const now = new Date()
  const jobStatus: ProductionStatus | null =
    status === 'received'
      ? 'quality_check'
      : status === 'completed' && a.shareCustomerData
        ? 'ready_to_ship'
        : null

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.providerAssignment.updateMany({
      where: { id: a.id, status: a.status },
      data: {
        status,
        ...(status === 'completed' ? { completedAt: now } : {}),
        ...(status === 'received' ? { receivedAt: now } : {}),
        ...(status === 'cancelled' ? { cancelledAt: now } : {}),
      },
    })
    if (changed.count !== 1) throw conflict('Der Auftrag wurde zwischenzeitlich geändert')
    if (jobStatus) {
      await tx.printerJob.updateMany({
        where: { orderId: a.orderId, status: { not: 'shipped' } },
        data: {
          status: jobStatus,
          ...(jobStatus === 'ready_to_ship' ? { finishedAt: now } : {}),
        },
      })
      await tx.order.updateMany({
        where: { id: a.orderId, status: 'in_production' },
        data: { status: jobStatus },
      })
    }
    return tx.providerAssignment.findUniqueOrThrow({ where: { id: a.id } })
  })

  const cancelEmailSent =
    status === 'cancelled' ? await sendProviderCancellation(a.provider, a.order.orderNumber) : null
  return { assignment: updated, cancelEmailSent }
}

/** Order cancelled/refunded: an open provider assignment is cancelled and the provider told. */
export async function cancelOpenAssignment(orderId: string) {
  const open = await prisma.providerAssignment.findFirst({
    where: { orderId, status: 'assigned' },
    select: { id: true },
  })
  return open ? setAssignmentStatus(open.id, 'cancelled') : null
}
