import { shipmentCreateSchema, shipmentShipSchema, shipmentStatusSchema } from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import { notFound } from '../../middleware/error.js'
import { jobsQcClearance } from '../../services/qc.js'
import {
  createShipment,
  generateDeliveryNotePdf,
  generatePackingListPdf,
  shipmentJobIds,
  shipShipment,
  transitionShipment,
} from '../../services/shipment-flow.js'

export const adminShipmentsRouter = Router()

const shipmentInclude = {
  order: {
    select: { id: true, orderNumber: true, status: true, email: true, firstName: true, lastName: true },
  },
  items: { include: { orderItem: { select: { id: true, name: true, quantity: true, colorSelection: true } } } },
  statusEvents: {
    orderBy: { createdAt: 'asc' as const },
    include: { byUser: { select: { name: true, email: true } } },
  },
  createdBy: { select: { name: true, email: true } },
} satisfies NonNullable<Parameters<typeof prisma.shipment.findUnique>[0]>['include']

adminShipmentsRouter.get('/', requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const orderId = req.query.orderId ? String(req.query.orderId) : undefined
    const shipments = await prisma.shipment.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(orderId ? { orderId } : {}),
      },
      include: {
        order: { select: { orderNumber: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    res.json({ shipments })
  } catch (err) {
    next(err)
  }
})

/** Create a shipment (partial shipments allowed, quantities validated per item). */
adminShipmentsRouter.post('/', requirePermission('shipments:write'), async (req, res, next) => {
  try {
    const input = shipmentCreateSchema.parse(req.body)
    const shipment = await createShipment({ ...input, createdById: req.user?.id })
    await audit(req, 'shipment.create', { type: 'shipment', id: shipment.id }, { orderId: input.orderId })
    res.status(201).json({ shipment })
  } catch (err) {
    next(err)
  }
})

/** Detail with status history + QC clearance per print job behind the items. */
adminShipmentsRouter.get('/:id', requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: String(req.params.id) },
      include: shipmentInclude,
    })
    if (!shipment) throw notFound('Shipment not found')
    const jobIds = await shipmentJobIds(shipment.id)
    const qcClearance = await jobsQcClearance(jobIds)
    res.json({ shipment, qcClearance })
  } catch (err) {
    next(err)
  }
})

/**
 * Status transition via the shipment status machine. The QC gate lives in
 * transitionShipment(): waiting_for_qc → ready_for_shipping requires every
 * print job behind the items to be QC-cleared (409 otherwise).
 */
adminShipmentsRouter.post('/:id/status', requirePermission('shipments:write'), async (req, res, next) => {
  try {
    const input = shipmentStatusSchema.parse(req.body)
    const before = await prisma.shipment.findUnique({ where: { id: String(req.params.id) } })
    if (!before) throw notFound('Shipment not found')
    const shipment = await transitionShipment(before.id, input.status, {
      byUserId: req.user?.id,
      note: input.note,
    })
    await audit(req, 'shipment.status', { type: 'shipment', id: shipment.id }, { from: before.status, to: input.status })
    res.json({ shipment })
  } catch (err) {
    next(err)
  }
})

/** Ship: carrier + tracking, marks order shipped, sends the shipping email (orders:ship). */
adminShipmentsRouter.post('/:id/ship', requirePermission('orders:ship'), async (req, res, next) => {
  try {
    const input = shipmentShipSchema.parse(req.body)
    const shipment = await shipShipment({
      shipmentId: String(req.params.id),
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      byUserId: req.user?.id,
    })
    await audit(req, 'shipment.shipped', { type: 'shipment', id: shipment.id }, input)
    res.json({ shipment })
  } catch (err) {
    next(err)
  }
})

/** Packing list PDF (regenerated if the file is missing). */
adminShipmentsRouter.get('/:id/packing-list.pdf', requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: String(req.params.id) } })
    if (!shipment) throw notFound('Shipment not found')
    const filePath = await generatePackingListPdf(shipment.id)
    res.download(filePath, `${shipment.shipmentNumber}-packliste.pdf`)
  } catch (err) {
    next(err)
  }
})

/** Delivery note PDF (regenerated if the file is missing). */
adminShipmentsRouter.get('/:id/delivery-note.pdf', requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: String(req.params.id) } })
    if (!shipment) throw notFound('Shipment not found')
    const filePath = await generateDeliveryNotePdf(shipment.id)
    res.download(filePath, `${shipment.shipmentNumber}-lieferschein.pdf`)
  } catch (err) {
    next(err)
  }
})
