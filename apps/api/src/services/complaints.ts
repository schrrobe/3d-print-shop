import { renderComplaintReceived, renderComplaintUpdated } from '@print-shop/emails'
import { formatInvoiceNumber } from '@print-shop/utils'
import type { ComplaintStatus } from '@print-shop/types'
import type { Complaint, Order } from '@prisma/client'
import { env } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { sendEmail } from './email.js'

/** Sequential per-year complaint number (REK-2026-00001), same locking as invoices. */
export async function nextComplaintNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const counter = await prisma.complaintCounter.upsert({
    where: { year },
    create: { year, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  })
  return formatInvoiceNumber('REK', year, counter.lastSequence)
}

export function complaintUrl(complaint: { complaintNumber: string; accessToken: string }): string {
  return `${env.WEB_URL}/complaint/${complaint.complaintNumber}?token=${complaint.accessToken}`
}

/** Customer-facing status labels (German first — shop default; emails pick by locale). */
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  submitted: 'Eingereicht',
  in_review: 'In Prüfung',
  info_needed: 'Weitere Informationen benötigt',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  replacement_planned: 'Ersatzdruck geplant',
  refund_planned: 'Erstattung geplant',
  closed: 'Abgeschlossen',
}

export async function sendComplaintReceivedEmail(
  complaint: Complaint,
  order: Order,
): Promise<void> {
  await sendEmail(
    order.email,
    'complaint_received',
    renderComplaintReceived(
      {
        complaintNumber: complaint.complaintNumber,
        orderNumber: order.orderNumber,
        firstName: order.firstName,
        complaintUrl: complaintUrl(complaint),
      },
      order.locale,
    ),
  )
}

export async function sendComplaintUpdatedEmail(
  complaint: Complaint,
  order: Order,
  message?: string,
): Promise<void> {
  await sendEmail(
    order.email,
    'complaint_updated',
    renderComplaintUpdated(
      {
        complaintNumber: complaint.complaintNumber,
        orderNumber: order.orderNumber,
        firstName: order.firstName,
        complaintUrl: complaintUrl(complaint),
        statusLabel: COMPLAINT_STATUS_LABELS[complaint.status],
        message,
      },
      order.locale,
    ),
  )
}

/** Public DTO — no internalNote, no storedPath, no staff identities. */
export function complaintPublicDto(complaint: {
  complaintNumber: string
  status: ComplaintStatus
  reason: string
  description: string
  createdAt: Date
  updatedAt: Date
  order: { orderNumber: string }
  items: { quantity: number; note: string | null; orderItem: { name: string } }[]
  attachments: { id: string; originalName: string; createdAt: Date }[]
  decisions: { resolution: string; note: string | null; decidedAt: Date }[]
}) {
  return {
    complaintNumber: complaint.complaintNumber,
    status: complaint.status,
    reason: complaint.reason,
    description: complaint.description,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    orderNumber: complaint.order.orderNumber,
    items: complaint.items.map((i) => ({
      name: i.orderItem.name,
      quantity: i.quantity,
      note: i.note,
    })),
    attachments: complaint.attachments.map((a) => ({
      id: a.id,
      originalName: a.originalName,
      createdAt: a.createdAt,
    })),
    decisions: complaint.decisions.map((d) => ({
      resolution: d.resolution,
      note: d.note,
      decidedAt: d.decidedAt,
    })),
  }
}
