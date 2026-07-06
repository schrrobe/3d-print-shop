import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  assertOrderTransition,
  assertShipmentTransition,
  canTransitionProduction,
} from '@print-shop/utils'
import type { Carrier, Order, OrderItem, Shipment, ShipmentItem } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { nextSequentialNumber } from '../lib/sequential-number.js'
import { badRequest, conflict, notFound } from '../middleware/error.js'
import { notifyShipped } from './order-flow.js'
import { allJobsQcCleared } from './qc.js'

/** Sequential per-year shipment number (VER-2026-00001). */
export async function nextShipmentNumber(): Promise<string> {
  return (await nextSequentialNumber(prisma.shipmentCounter, 'VER')).number
}

/** Jobs whose QC clearance gates this shipment = jobs of the shipped order items. */
export async function shipmentJobIds(shipmentId: string): Promise<string[]> {
  const items = await prisma.shipmentItem.findMany({
    where: { shipmentId },
    select: { orderItemId: true },
  })
  const jobs = await prisma.printerJob.findMany({
    where: { orderItemId: { in: items.map((i) => i.orderItemId) }, status: { not: 'shipped' } },
    select: { id: true },
  })
  return jobs.map((j) => j.id)
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
 * Shipment status transition with the QC gate: `waiting_for_qc → ready_for_shipping`
 * requires every print job behind the shipped items to be QC-cleared
 * (latest record passed or consciously overridden).
 */
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

  if (shipment.status === 'waiting_for_qc' && toStatus === 'ready_for_shipping') {
    const jobIds = await shipmentJobIds(shipment.id)
    if (jobIds.length > 0 && !(await allJobsQcCleared(jobIds))) {
      throw conflict(
        'Quality check pending: all print jobs of this shipment must pass QC (or be consciously overridden) before shipping',
      )
    }
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
 * Transaction: shipment → shipped, order → shipped, ready_to_ship jobs → shipped.
 * The shipping confirmation email goes out after the transaction commits.
 */
export async function shipShipment(input: {
  shipmentId: string
  carrier: Carrier
  trackingNumber: string
  byUserId?: string
  eventNote?: string
}): Promise<Shipment> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: input.shipmentId },
    include: { order: true },
  })
  if (!shipment) throw notFound('Shipment not found')
  assertShipmentTransition(shipment.status, 'shipped')
  assertOrderTransition(shipment.order.status, 'shipped')

  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
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
        shippedAt: now,
      },
    })
    const jobs = await tx.printerJob.findMany({ where: { orderId: shipment.orderId } })
    for (const job of jobs) {
      if (canTransitionProduction(job.status, 'shipped')) {
        await tx.printerJob.update({ where: { id: job.id }, data: { status: 'shipped' } })
      }
    }
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

function shipmentPdfDir(): string {
  return path.join(env.INVOICE_DIR, 'shipping')
}

async function renderShipmentPdf(
  shipment: ShipmentWithRefs,
  variant: 'packing-list' | 'delivery-note',
): Promise<string> {
  await mkdir(shipmentPdfDir(), { recursive: true })
  const filePath = path.join(shipmentPdfDir(), `${shipment.shipmentNumber}-${variant}.pdf`)
  const isPackingList = variant === 'packing-list'

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const stream = createWriteStream(filePath)
  doc.pipe(stream)

  doc.fontSize(18).text('Print Shop')
  doc.fontSize(9).fillColor('#5e5e5e').text('Print Shop GmbH · Musterstraße 1 · 12345 Berlin')
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

  doc.text('Lieferadresse:')
  doc.text(`${shipment.order.firstName} ${shipment.order.lastName}`)
  if (shipment.order.company) doc.text(shipment.order.company)
  doc.text(shipment.order.street)
  doc.text(`${shipment.order.zip} ${shipment.order.city}, ${shipment.order.country}`)
  doc.moveDown(2)

  doc.fontSize(11).text('Positionen', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10)
  for (const item of shipment.items) {
    doc.text(`${item.quantity}× ${item.orderItem.name}`)
    if (isPackingList && item.orderItem.colorSelection) {
      doc
        .fontSize(8)
        .fillColor('#5e5e5e')
        .text(`   Farbkonfiguration: ${JSON.stringify(item.orderItem.colorSelection)}`)
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
      .text('Lieferschein — kein Rechnungsdokument. Die Rechnung wurde separat per E-Mail zugestellt.')
  }

  doc.end()
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
  return filePath
}

/** Renders (or re-renders) the packing list PDF and stores its path. */
export async function generatePackingListPdf(shipmentId: string): Promise<string> {
  const shipment = await loadShipmentForPdf(shipmentId)
  const filePath = await renderShipmentPdf(shipment, 'packing-list')
  await prisma.shipment.update({ where: { id: shipmentId }, data: { packingListPdfPath: filePath } })
  return filePath
}

/** Renders (or re-renders) the delivery note PDF and stores its path. */
export async function generateDeliveryNotePdf(shipmentId: string): Promise<string> {
  const shipment = await loadShipmentForPdf(shipmentId)
  const filePath = await renderShipmentPdf(shipment, 'delivery-note')
  await prisma.shipment.update({ where: { id: shipmentId }, data: { deliveryNotePdfPath: filePath } })
  return filePath
}

async function loadShipmentForPdf(shipmentId: string): Promise<ShipmentWithRefs> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { order: { include: { items: true } }, items: { include: { orderItem: true } } },
  })
  if (!shipment) throw notFound('Shipment not found')
  return shipment
}
