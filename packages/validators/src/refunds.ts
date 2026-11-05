import { z } from 'zod'

const refundReasonSchema = z.string().trim().min(1).max(500)

/** POST /api/admin/refunds/orders/:orderId — an exact amount or the full remaining amount. */
export const refundCreateSchema = z
  .object({
    amountCents: z.number().int().min(1).max(100_000_000).optional(),
    full: z.boolean().optional(),
    reason: refundReasonSchema,
    complaintId: z.string().min(1).max(40).optional(),
    /** Bank transfer / bitcoin: admin confirms the money was already paid back. */
    confirmManual: z.boolean().optional(),
  })
  .refine((d) => d.full === true || d.amountCents !== undefined, {
    message: 'amountCents or full is required',
    path: ['amountCents'],
  })
export type RefundCreateInput = z.infer<typeof refundCreateSchema>

/** POST /api/admin/refunds/orders/:orderId/cancel — "Stornieren & erstatten". */
export const refundCancelSchema = z.object({
  reason: refundReasonSchema,
  confirmManual: z.boolean().optional(),
})
export type RefundCancelInput = z.infer<typeof refundCancelSchema>
