import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertOrderTransition, assertShipmentTransition, recipientOf } from '@print-shop/utils'
import type { Carrier, Order, OrderItem, Shipment, ShipmentItem } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { nextSequentialNumber } from '../lib/sequential-number.js'
import { badRequest, conflict, notFound } from '../middleware/error.js'
import { company } from './company.js'
import { cancelDhlLabel, createDhlLabel, toDhlShipment } from './dhl.js'
import { itemColorResolver } from './item-colors.js'
import { notifyShipped } from './order-flow.js'
import { isHeldExternally } from './providers.js'

/** Per-year shipment number (VER-2026-7Q3K9X). */
export async function nextShipmentNumber(): Promise<string> {
  return (await nextSequentialNumber(prisma.shipmentCounter, 'VER')).number
}

export async function createShipment(input: {
  orderId: string
  items: { orderItemId: string; quantity: number }[]
  weightGrams?: number | null
  notes?: string | null
  createdById?: string
}): Promise<Shipment> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true, shipments: { include: { items: true } } },
  })
  if (!order) throw notFound('Order not found')

  // Partial shipments: total shipped quantity per item must never exceed the ordered quantity.
  for (const item of input.items) {
    const orderItem = order.items.find((i) => i.id === item.orderItemId)
    if (!orderItem) throw badRequest(`Order item ${item.orderItemId} does not belong to this order`)
    const alreadyPlanned = order.shipments
      .filter((s) => s.status !== 'problem')
      .flatMap((s) => s.items)
      .filter((si) => si.orderItemId === item.orderItemId)
      .reduce((sum, si) => sum + si.quantity, 0)
    if (alreadyPlanned + item.quantity > orderItem.quantity) {
      throw conflict(
        `Quantity for "${orderItem.name}" exceeds the ordered amount (${alreadyPlanned}/${orderItem.quantity} already in shipments)`,
      )
    }
  }

  const shipmentNumber = await nextShipmentNumber()
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        shipmentNumber,
        orderId: order.id,
        status: 'waiting_for_qc',
        weightGrams: input.weightGrams ?? null,
        notes: input.notes ?? null,
        createdById: input.createdById ?? null,
        items: { create: input.items },
      },
    })
    await tx.shipmentStatusEvent.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: null,
        toStatus: 'waiting_for_qc',
        byUserId: input.createdById ?? null,
      },
    })
    return shipment
  })
}

/**
 * A DHL label still cancellable at DHL: packed and never shipped. (A shipment
 * shipped → problem → packed keeps its used label's PDF for reprints only.)
 */
/** DHL label PDFs (packing lists/delivery notes are rendered on demand). */
const labelDir = () => path.join(env.INVOICE_DIR, 'shipping')

export const hasActiveLabel = (s: Pick<Shipment, 'status' | 'labelPdfPath' | 'shippedAt'>) =>
  s.status === 'packed' && !!s.labelPdfPath && !s.shippedAt

/**
 * The packed shipment that ships the whole order from the order page: the
 * existing packed one, else an implicit one covering all items. 409 while an
 * earlier (unpacked) shipment holds items — an implicit one would count them twice.
 */
export async function packedShipmentFor(
  order: Order & { items: OrderItem[]; shipments: Shipment[] },
  options: { byUserId?: string | null; note: string },
): Promise<Shipment> {
  const packed = order.shipments.find((s) => s.status === 'packed')
  if (packed) return packed
  if (order.shipments.some((s) => ['waiting_for_qc', 'ready_for_shipping'].includes(s.status))) {
    throw conflict('Offene Sendung zuerst packen, dann versenden')
  }
  const shipmentNumber = await nextShipmentNumber()
  return prisma.$transaction(async (tx) => {
    // Concurrent callers (two tabs, double click) must share one implicit shipment.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${order.id}))`
    const raced = await tx.shipment.findFirst({ where: { orderId: order.id, status: 'packed' } })
    if (raced) return raced
    const created = await tx.shipment.create({
      data: {
        shipmentNumber,
        orderId: order.id,
        status: 'packed',
        packedAt: new Date(),
        createdById: options.byUserId ?? null,
        items: {
          create: order.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })),
        },
      },
    })
    await tx.shipmentStatusEvent.create({
      data: {
        shipmentId: created.id,
        fromStatus: null,
        toStatus: 'packed',
        byUserId: options.byUserId ?? null,
        note: options.note,
      },
    })
    return created
  })
}

/**
 * DHL label for the whole order (order page). The label's shipment number goes
 * to Shipment.carrier/trackingNumber so the ship form can prefill it; Order
 * fields stay untouched until shipShipment().
 */
export async function createOrderDhlLabel(input: {
  orderId: string
  weightGrams: number
  byUserId?: string
}): Promise<{ shipment: Shipment; warnings: string[] }> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true, shipments: true },
  })
  if (!order) throw notFound('Order not found')
  assertOrderTransition(order.status, 'shipped')
  if (await isHeldExternally(order.id))
    throw conflict('Externer Auftrag zuerst als fertig gemeldet / eingegangen markieren')
  if (order.shipments.some(hasActiveLabel)) {
    throw conflict('Es gibt bereits ein DHL-Label — zuerst stornieren')
  }

  const shipment = await packedShipmentFor(order, { byUserId: input.byUserId, note: 'dhl-label' })
  const shipmentItems = await prisma.shipmentItem.findMany({
    where: { shipmentId: shipment.id },
    include: { orderItem: true },
  })
  // The label carries the delivery address (if support set one), not the billing address.
  const to = recipientOf(order)
  const label = await createDhlLabel(
    toDhlShipment(
      { ...order, ...to, company: to.company ?? null },
      shipmentItems.map((si) => ({
        quantity: si.quantity,
        unitPriceCents: si.orderItem.unitPriceCents,
      })),
      input.weightGrams,
      company(),
    ),
  )

  const filePath = path.join(labelDir(), `${shipment.shipmentNumber}-dhl-${label.shipmentNo}.pdf`)
  try {
    await mkdir(labelDir(), { recursive: true })
    await writeFile(filePath, label.pdf)
    // Atomic claim: a concurrent request (double click) that labelled first wins.
    const claimed = await prisma.shipment.updateMany({
      where: { id: shipment.id, status: 'packed', labelPdfPath: null },
      data: {
        carrier: 'dhl',
        trackingNumber: label.shipmentNo,
        weightGrams: input.weightGrams,
        labelPdfPath: filePath,
      },
    })
    if (claimed.count === 0) throw conflict('Es gibt bereits ein DHL-Label — zuerst stornieren')
  } catch (err) {
    // The label is paid once DHL issued it — never leave one we don't track.
    await cancelDhlLabel(label.shipmentNo).catch((cancelErr) =>
      console.error(`[dhl] orphaned label ${label.shipmentNo}, cancel failed:`, cancelErr),
    )
    await rm(filePath, { force: true })
    throw err
  }
  return {
    shipment: await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } }),
    warnings: label.warnings,
  }
}

/** Cancels the order's active DHL label at DHL, then forgets it locally. Returns the shipment as it was. */
export async function cancelOrderDhlLabel(orderId: string): Promise<Shipment> {
  const shipment = await prisma.shipment.findFirst({
    where: { orderId, status: 'packed', labelPdfPath: { not: null }, shippedAt: null },
  })
  if (!shipment?.trackingNumber) throw notFound('Kein stornierbares DHL-Label')
  await cancelDhlLabel(shipment.trackingNumber)
  // Conditional: a concurrent ship with this number must keep its carrier/tracking.
  await prisma.shipment.updateMany({
    where: { id: shipment.id, status: 'packed' },
    data: { carrier: null, trackingNumber: null, labelPdfPath: null },
  })
  // Cancelled at DHL already; a leftover file only needs a manual cleanup.
  await rm(shipment.labelPdfPath!, { force: true }).catch((err) =>
    console.error(`[dhl] could not delete label ${shipment.labelPdfPath}:`, err),
  )
  return shipment
}

/** Shipment status transition via the shipment status machine. */
export async function transitionShipment(
  shipmentId: string,
  toStatus: Shipment['status'],
  options: { byUserId?: string; note?: string } = {},
): Promise<Shipment> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
  if (!shipment) throw notFound('Shipment not found')
  // `shipped` is owned by shipShipment() (single-writer rule — it also writes
  // carrier/tracking/shippedAt, syncs the Order and jobs, and emails the customer).
  // Reject it here so the generic status endpoint can't bypass that flow.
  if (toStatus === 'shipped') {
    throw conflict('Use the ship action (carrier + tracking) to mark a shipment as shipped')
  }
  assertShipmentTransition(shipment.status, toStatus)
  // Leaving `packed` would strand the paid label (cancel only works on packed shipments).
  // (The PDF stays for reprints after shipping — only a packed one is still active.)
  if (hasActiveLabel(shipment)) {
    throw conflict('DHL-Label zuerst stornieren')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: toStatus,
        packedAt: toStatus === 'packed' ? new Date() : shipment.packedAt,
        deliveredAt: toStatus === 'delivered' ? new Date() : shipment.deliveredAt,
      },
    })
    await tx.shipmentStatusEvent.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus,
        byUserId: options.byUserId ?? null,
        note: options.note ?? null,
      },
    })
    return updated
  })
}

/**
 * The ONLY place that marks orders as shipped and writes Order.carrier/
 * trackingNumber/shippedAt (single-writer rule — avoids Order↔Shipment drift).
 * It also resets Order.trackingUrl with each new number; PATCH /admin/orders/:id
 * may add or fix the link afterwards (Shipment has no trackingUrl to drift from).
 * Transaction: shipment → shipped, order → shipped, open print jobs → shipped.
 * By default 409 while any job is not yet ready_to_ship, so a partial shipment
 * can't close jobs of items still in production. `closeAllJobs` (whole order
 * shipped from the order page) closes them whatever their production status.
 * The shipping confirmation email goes out after the transaction commits.
 */
export async function shipShipment(input: {
  shipmentId: string
  carrier: Carrier
  trackingNumber: string
  trackingUrl?: string | null
  byUserId?: string
  eventNote?: string
  closeAllJobs?: boolean
}): Promise<Shipment> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: input.shipmentId },
    include: { order: true },
  })
  if (!shipment) throw notFound('Shipment not found')
  assertShipmentTransition(shipment.status, 'shipped')
  // An unused paid label would otherwise stay active at DHL.
  if (
    hasActiveLabel(shipment) &&
    (input.carrier !== 'dhl' || input.trackingNumber !== shipment.trackingNumber)
  ) {
    throw conflict('DHL-Label zuerst stornieren oder dessen Sendungsnummer verwenden')
  }
  assertOrderTransition(shipment.order.status, 'shipped')
  // closeAllJobs would otherwise ship goods still with (or not yet back from) a provider.
  if (await isHeldExternally(shipment.orderId))
    throw conflict('Externer Auftrag zuerst als fertig gemeldet / eingegangen markieren')

  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    if (!input.closeAllJobs) {
      const open = await tx.printerJob.findMany({
        where: { orderId: shipment.orderId, status: { not: 'shipped' } },
        select: { status: true },
      })
      if (open.some((job) => job.status !== 'ready_to_ship')) {
        throw conflict('All print jobs of the order must be ready to ship before shipping')
      }
    }
    const result = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'shipped',
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        shippedAt: now,
      },
    })
    await tx.order.update({
      where: { id: shipment.orderId },
      data: {
        status: 'shipped',
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        // Reset with every new number so a stale link never points at another parcel.
        trackingUrl: input.trackingUrl ?? null,
        shippedAt: now,
      },
    })
    // A job closed mid-print would leave its printer stuck in `printing`
    // (shipped is terminal, so the production route can never free it).
    const printing = await tx.printerJob.findMany({
      where: { orderId: shipment.orderId, status: 'printing', printerId: { not: null } },
      select: { printerId: true },
    })
    if (printing.length > 0) {
      await tx.printer.updateMany({
        where: { id: { in: printing.map((j) => j.printerId!) } },
        data: { status: 'idle' },
      })
    }
    await tx.printerJob.updateMany({
      where: { orderId: shipment.orderId, status: { not: 'shipped' } },
      data: { status: 'shipped' },
    })
    await tx.shipmentStatusEvent.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: 'shipped',
        byUserId: input.byUserId ?? null,
        note: input.eventNote ?? null,
      },
    })
    return result
  })

  await notifyShipped(shipment.orderId)
  return updated
}

type ShipmentWithRefs = Shipment & {
  order: Order & { items: OrderItem[] }
  items: (ShipmentItem & { orderItem: OrderItem })[]
}

const CARRIER_LABELS: Record<string, string> = { dhl: 'DHL', hermes: 'Hermes' }

function companyAddress(): string {
  const c = company()
  return [c.name, c.street, `${c.zip} ${c.city}`].join(' · ')
}

async function renderShipmentPdf(
  shipment: ShipmentWithRefs,
  variant: 'packing-list' | 'delivery-note',
): Promise<Buffer> {
  const isPackingList = variant === 'packing-list'

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.fontSize(18).text(company().name)
  doc.fontSize(9).fillColor('#5e5e5e').text(companyAddress())
  doc.moveDown(2)

  doc
    .fillColor('#000000')
    .fontSize(14)
    .text(`${isPackingList ? 'Packliste' : 'Lieferschein'} ${shipment.shipmentNumber}`)
  doc.fontSize(10)
  doc.text(`Bestellnummer: ${shipment.order.orderNumber}`)
  doc.text(`Datum: ${new Date().toISOString().slice(0, 10)}`)
  if (shipment.carrier) {
    doc.text(`Versanddienstleister: ${CARRIER_LABELS[shipment.carrier] ?? shipment.carrier}`)
  }
  if (shipment.trackingNumber) doc.text(`Sendungsnummer: ${shipment.trackingNumber}`)
  doc.moveDown()

  const to = recipientOf(shipment.order)
  doc.text('Lieferadresse:')
  doc.text(`${to.firstName} ${to.lastName}`)
  if (to.company) doc.text(to.company)
  doc.text(to.street)
  doc.text(`${to.zip} ${to.city}, ${to.country}`)
  doc.moveDown(2)

  doc.fontSize(11).text('Positionen', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10)
  const colorsOf = isPackingList
    ? await itemColorResolver(shipment.items.map((i) => i.orderItem))
    : () => []
  for (const item of shipment.items) {
    doc.text(`${item.quantity}× ${item.orderItem.name}`)
    if (!isPackingList) continue
    const details = [
      ...colorsOf(item.orderItem).map((c) => `${c.label}: ${c.name}`),
      ...(item.orderItem.personalization ? [`Aufdruck: „${item.orderItem.personalization}“`] : []),
    ]
    if (details.length) {
      doc.fontSize(8).fillColor('#5e5e5e')
      for (const line of details) doc.text(`   ${line}`)
      doc.fontSize(10).fillColor('#000000')
    }
  }
  doc.moveDown(2)
  if (isPackingList) {
    doc.fontSize(9).fillColor('#5e5e5e')
    doc.text('Interne Packliste — Vollständigkeit und Verpackung je Position abhaken.')
    if (shipment.notes) doc.text(`Hinweise: ${shipment.notes}`)
  } else {
    doc
      .fontSize(9)
      .fillColor('#5e5e5e')
      .text(
        'Lieferschein — kein Rechnungsdokument. Die Rechnung wurde separat per E-Mail zugestellt.',
      )
  }

  doc.end()
  return done
}

// Rendered on every download, never stored: a support change to the delivery
// address must show up at once, and a cache would race with it.
/** Packing list PDF (with colour configuration per item). */
export async function generatePackingListPdf(shipmentId: string): Promise<Buffer> {
  return renderShipmentPdf(await loadShipmentForPdf(shipmentId), 'packing-list')
}

/** Delivery note PDF for the parcel. */
export async function generateDeliveryNotePdf(shipmentId: string): Promise<Buffer> {
  return renderShipmentPdf(await loadShipmentForPdf(shipmentId), 'delivery-note')
}

async function loadShipmentForPdf(shipmentId: string): Promise<ShipmentWithRefs> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { order: { include: { items: true } }, items: { include: { orderItem: true } } },
  })
  if (!shipment) throw notFound('Shipment not found')
  return shipment
}
