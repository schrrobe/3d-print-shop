import {
  AMS_SLOT_STATUSES,
  CARRIERS,
  COLOR_ZONE_SLOTS,
  COMPLAINT_REASONS,
  COMPLAINT_RESOLUTIONS,
  COMPLAINT_STATUSES,
  CONSENT_CATEGORIES,
  LOCALES,
  PAYMENT_METHODS,
  QC_STATUSES,
  REVIEW_STATUSES,
  SHIPMENT_STATUSES,
  SOCIAL_PLATFORMS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  USER_ROLES,
  VOUCHER_TYPES,
} from '@print-shop/types'
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_BYTES } from '@print-shop/utils'
import { z } from 'zod'

// ---------- Primitives ----------

export const localeSchema = z.enum(LOCALES)
export const colorZoneSlotSchema = z.enum(COLOR_ZONE_SLOTS)
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color')
export const cuidSchema = z.string().min(1).max(64)
export const priceCentsSchema = z.number().int().min(0).max(100_000_000)

// ---------- Address / customer ----------

export const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  company: z.string().trim().max(150).optional(),
  street: z.string().trim().min(1).max(200),
  zip: z.string().trim().min(3).max(12),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().length(2, 'ISO 3166-1 alpha-2'),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional(),
})

// ---------- Cart / checkout ----------

export const colorSelectionSchema = z.record(colorZoneSlotSchema, cuidSchema)

export const cartItemInputSchema = z.object({
  productId: cuidSchema,
  quantity: z.number().int().min(1).max(99),
  colorSelection: colorSelectionSchema,
})

/** Raw customer input — the API normalizes to uppercase before lookup. */
export const voucherCodeInputSchema = z.string().trim().min(1).max(40)

export const checkoutSchema = z.object({
  items: z.array(cartItemInputSchema).min(1).max(50),
  address: addressSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  locale: localeSchema.default('de'),
  note: z.string().trim().max(1000).optional(),
  voucherCode: voucherCodeInputSchema.optional(),
  /**
   * Cookie-consent snapshot at order time, persisted onto the order's server
   * events (drives the marketing outbox fan-out). Optional so older clients
   * stay valid — missing means no consent (fail-closed).
   */
  consent: z
    .object({ statistics: z.boolean(), marketing: z.boolean() })
    .optional(),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

export const checkoutIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid Idempotency-Key')

// ---------- Vouchers ----------

export const voucherValidateSchema = z.object({
  code: voucherCodeInputSchema,
  items: z.array(cartItemInputSchema).min(1).max(50),
})
export type VoucherValidateInput = z.infer<typeof voucherValidateSchema>

const voucherBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, digits, - and _'),
  type: z.enum(VOUCHER_TYPES),
  /** percent: 1-100, fixed: cents */
  value: z.number().int().min(1).max(100_000_000),
  active: z.boolean().default(true),
  validFrom: z.string().datetime({ offset: true }).nullable().optional(),
  validUntil: z.string().datetime({ offset: true }).nullable().optional(),
  maxRedemptions: z.number().int().min(1).max(1_000_000).nullable().optional(),
  minOrderCents: priceCentsSchema.default(0),
  note: z.string().trim().max(2000).nullable().optional(),
})

const percentValueCheck = (v: { type?: string; value?: number }) =>
  v.type !== 'percent' || v.value == null || v.value <= 100

/** A window with both ends set must not be reversed (else it's never redeemable). */
const validRangeCheck = (v: { validFrom?: string | null; validUntil?: string | null }) =>
  !v.validFrom || !v.validUntil || new Date(v.validFrom) < new Date(v.validUntil)

export const voucherCreateSchema = voucherBaseSchema
  .refine(percentValueCheck, { message: 'Percent vouchers allow at most 100', path: ['value'] })
  .refine(validRangeCheck, { message: 'validFrom must be before validUntil', path: ['validUntil'] })
export type VoucherCreateInput = z.infer<typeof voucherCreateSchema>

export const voucherUpdateSchema = voucherBaseSchema
  .partial()
  .refine(percentValueCheck, { message: 'Percent vouchers allow at most 100', path: ['value'] })
  .refine(validRangeCheck, { message: 'validFrom must be before validUntil', path: ['validUntil'] })
export type VoucherUpdateInput = z.infer<typeof voucherUpdateSchema>

// ---------- Upload / quote request ----------

export const uploadRequestSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional(),
  description: z.string().trim().min(10).max(4000),
  quantity: z.number().int().min(1).max(1000).default(1),
  locale: localeSchema.default('de'),
  /* Placeholder: future legal upload terms acceptance flag */
  acceptsUploadTerms: z.boolean().optional(),
})
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>

export const uploadedFileMetaSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .refine(
      (name) => ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
      `Only ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')} files are allowed`,
    ),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES, 'File exceeds 50 MB limit'),
})

export const quoteCreateSchema = z.object({
  quoteRequestId: cuidSchema,
  priceCents: priceCentsSchema.refine((v) => v > 0, 'Quote price must be positive'),
  message: z.string().trim().max(4000).optional(),
  validDays: z.number().int().min(1).max(90).default(14),
})

export const quoteDecisionSchema = z.object({
  token: z.string().min(16).max(128),
  decision: z.enum(['accept', 'decline']),
})

// ---------- Auth ----------

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(254),
})

export const userCreateSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(150),
  password: z.string().min(12).max(200),
  role: z.enum(USER_ROLES),
})

export const userUpdateSchema = userCreateSchema.partial().extend({
  active: z.boolean().optional(),
})

// ---------- Admin: products & colors ----------

export const productTranslationSchema = z.object({
  locale: localeSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(180).nullable().optional(),
})

export const productColorSlotInputSchema = z.object({
  slot: colorZoneSlotSchema,
  label: z.string().trim().min(1).max(100),
  defaultColorId: cuidSchema.nullable().optional(),
})

export const productCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
  priceCents: priceCentsSchema,
  active: z.boolean().default(false),
  translations: z.array(productTranslationSchema).min(1),
  colorSlots: z.array(productColorSlotInputSchema).max(4),
})

export const productUpdateSchema = productCreateSchema.partial()

export const colorCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  hex: hexColorSchema,
  material: z.string().trim().min(1).max(100),
  manufacturer: z.string().trim().min(1).max(100),
  active: z.boolean().default(true),
  stockGrams: z.number().int().min(0).nullable().optional(),
  amsSlot: z.number().int().min(1).max(16).nullable().optional(),
})

export const colorUpdateSchema = colorCreateSchema.partial()

// ---------- Admin: printers & production ----------

export const printerCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(2000).optional(),
})

export const printJobAssignSchema = z.object({
  printerId: cuidSchema,
  printDurationMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 14),
  spoolNotes: z.string().trim().max(2000).optional(),
})

export const shippingUpdateSchema = z.object({
  carrier: z.enum(CARRIERS),
  trackingNumber: z.string().trim().min(4).max(64),
})

// ---------- Consent ----------

export const consentLogSchema = z.object({
  categories: z.object({
    necessary: z.literal(true),
    statistics: z.boolean(),
    marketing: z.boolean(),
  }),
  version: z.string().min(1).max(20),
  locale: localeSchema.optional(),
})
export type ConsentLogInput = z.infer<typeof consentLogSchema>

export const consentCategorySchema = z.enum(CONSENT_CATEGORIES)

// ---------- Admin: tracking settings ----------

// Real-world formats: GA4 "G-" + 10 alnum, GTM "GTM-" + 6-8 alnum, Meta Pixel 15-16 digits.
// Bounds are slightly loosened to survive vendor format drift while rejecting garbage.
export const GA4_MEASUREMENT_ID_REGEX = /^G-[A-Z0-9]{4,14}$/
export const GTM_CONTAINER_ID_REGEX = /^GTM-[A-Z0-9]{4,10}$/
export const META_PIXEL_ID_REGEX = /^\d{5,20}$/

/** Empty string or null clears the value; stored as null. Trims whitespace. */
const optionalTrackingId = (regex: RegExp, message: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v),
    z.string().regex(regex, message).nullable(),
  )

export const trackingSettingsSchema = z.object({
  metaPixelId: optionalTrackingId(META_PIXEL_ID_REGEX, 'Meta Pixel ID must be 5-20 digits'),
  ga4MeasurementId: optionalTrackingId(
    GA4_MEASUREMENT_ID_REGEX,
    'GA4 Measurement ID must match G-XXXXXXXXXX',
  ),
  gtmContainerId: optionalTrackingId(
    GTM_CONTAINER_ID_REGEX,
    'GTM Container ID must match GTM-XXXXXXX',
  ),
})
export type TrackingSettingsInput = z.infer<typeof trackingSettingsSchema>

// ---------- Payments ----------

export const markPaidSchema = z.object({
  reference: z.string().trim().max(200).optional(),
})

// ---------- Support tickets ----------

export const ticketCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(4000),
  category: z.enum(TICKET_CATEGORIES).default('other'),
  orderNumber: z.string().trim().max(40).optional(),
  locale: localeSchema.default('de'),
})
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>

export const ticketMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
})
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>

export const ticketUpdateSchema = z.object({
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  assignedToId: cuidSchema.nullable().optional(),
})
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>

export const ticketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
})

// ---------- Social media planner ----------

/** Instagram caps captions at 2200 characters — the stricter of both platforms. */
export const SOCIAL_CAPTION_MAX_LENGTH = 2200

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS)

/** 1–2 distinct platform targets per editor submission (each becomes its own post row). */
export const socialPostPlatformsSchema = z
  .array(socialPlatformSchema)
  .min(1, 'At least one platform is required')
  .max(SOCIAL_PLATFORMS.length)
  .refine((platforms) => new Set(platforms).size === platforms.length, 'Duplicate platform')

export const socialMediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (url) => url.startsWith('/') || /^https?:\/\//.test(url),
    'Media URL must be absolute (http/https) or app-relative (/…)',
  )

export const socialPostCreateSchema = z.object({
  platforms: socialPostPlatformsSchema,
  caption: z.string().trim().min(1).max(SOCIAL_CAPTION_MAX_LENGTH),
  mediaUrls: z.array(socialMediaUrlSchema).max(10).default([]),
  productId: cuidSchema.nullable().optional(),
  /** ISO-8601 UTC. Editor converts from the admin's local timezone before submitting. */
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  /** true = direkt planen (Status scheduled), false/absent = Entwurf */
  schedule: z.boolean().default(false),
})
export type SocialPostCreateInput = z.infer<typeof socialPostCreateSchema>

export const socialPostUpdateSchema = z.object({
  caption: z.string().trim().min(1).max(SOCIAL_CAPTION_MAX_LENGTH).optional(),
  mediaUrls: z.array(socialMediaUrlSchema).max(10).optional(),
  productId: cuidSchema.nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
})
export type SocialPostUpdateInput = z.infer<typeof socialPostUpdateSchema>

export const socialPostScheduleSchema = z.object({
  /** Past values are allowed: the next worker tick publishes immediately. */
  scheduledAt: z.string().datetime({ offset: true }),
})
export type SocialPostScheduleInput = z.infer<typeof socialPostScheduleSchema>

/**
 * Platform readiness for scheduling: Instagram feed posts require at least
 * one image; Facebook page posts may be text-only.
 */
export function validateSocialPostReadyToSchedule(post: {
  platform: (typeof SOCIAL_PLATFORMS)[number]
  mediaUrls: string[]
}): { ok: true } | { ok: false; error: string } {
  if (post.platform === 'instagram' && post.mediaUrls.length === 0) {
    return { ok: false, error: 'Instagram posts require at least one image' }
  }
  return { ok: true }
}

// ---------- Complaints (Reklamationen) ----------

export const complaintItemInputSchema = z.object({
  orderItemId: cuidSchema,
  quantity: z.number().int().min(1).max(99).default(1),
  note: z.string().trim().max(1000).optional(),
})

/** Customer opens a complaint on their order (auth: orderNumber + order accessToken). */
export const complaintCreateSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  token: z.string().min(16).max(128),
  reason: z.enum(COMPLAINT_REASONS),
  description: z.string().trim().min(10).max(4000),
  items: z.array(complaintItemInputSchema).min(1).max(50),
  locale: localeSchema.default('de'),
})
export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>

export const complaintReplySchema = z.object({
  message: z.string().trim().min(1).max(4000),
})

export const complaintStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
})

export const complaintUpdateSchema = z.object({
  internalNote: z.string().trim().max(4000).nullable().optional(),
})

export const complaintDecisionSchema = z
  .object({
    resolution: z.enum(COMPLAINT_RESOLUTIONS),
    note: z.string().trim().max(4000).optional(),
    refundAmountCents: priceCentsSchema.nullable().optional(),
    voucherCode: z.string().trim().max(100).nullable().optional(),
  })
  .refine(
    (d) => d.resolution !== 'refund' || (d.refundAmountCents != null && d.refundAmountCents > 0),
    { message: 'refundAmountCents is required for refund decisions', path: ['refundAmountCents'] },
  )
export type ComplaintDecisionInput = z.infer<typeof complaintDecisionSchema>

/** Empty ticketId = create a new ticket from the complaint; set = link an existing one. */
export const complaintTicketSchema = z.object({
  ticketId: cuidSchema.nullable().optional(),
})

// ---------- Quality control ----------

export const qcCreateSchema = z.object({
  printerJobId: cuidSchema,
})

export const qcChecklistSchema = z.object({
  colorOk: z.boolean().optional(),
  surfaceOk: z.boolean().optional(),
  dimensionsOk: z.boolean().optional(),
  stabilityOk: z.boolean().optional(),
  completenessOk: z.boolean().optional(),
  packagingOk: z.boolean().optional(),
  note: z.string().trim().max(4000).nullable().optional(),
})

export const qcStatusSchema = z.object({
  status: z.enum(QC_STATUSES),
})

export const qcOverrideSchema = z.object({
  overrideReason: z
    .string()
    .trim()
    .min(10, 'Override reason must explain the conscious decision (min 10 chars)')
    .max(2000),
})

// ---------- Filament & AMS ----------

export const spoolCreateSchema = z.object({
  colorId: cuidSchema.nullable().optional(),
  material: z.string().trim().min(1).max(100),
  manufacturer: z.string().trim().max(100).nullable().optional(),
  label: z.string().trim().max(150).nullable().optional(),
  totalGrams: z.number().int().min(0).max(100_000).nullable().optional(),
  remainingGrams: z.number().int().min(0).max(100_000).nullable().optional(),
  minRemainingGrams: z.number().int().min(0).max(100_000).nullable().optional(),
  storageLocation: z.string().trim().max(150).nullable().optional(),
  active: z.boolean().default(true),
  reorder: z.boolean().default(false),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export const spoolUpdateSchema = spoolCreateSchema.partial()

export const amsUnitSchema = z.object({
  printerId: cuidSchema,
  name: z.string().trim().min(1).max(100),
  position: z.number().int().min(1).max(4).default(1),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export const amsSlotUpdateSchema = z.object({
  spoolId: cuidSchema.nullable().optional(),
  status: z.enum(AMS_SLOT_STATUSES).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export const colorAvailabilitySchema = z.object({
  active: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  minStockGrams: z.number().int().min(0).max(1_000_000).nullable().optional(),
})

// ---------- Production calendar ----------

export const jobScheduleSchema = z
  .object({
    printerId: cuidSchema.nullable().optional(),
    /** UTC ISO-8601 — admin UI converts from local timezone. */
    plannedStartAt: z.string().datetime({ offset: true }),
    plannedEndAt: z.string().datetime({ offset: true }),
    /** true = book despite conflicts (audited) */
    force: z.boolean().default(false),
  })
  .refine((v) => new Date(v.plannedEndAt) > new Date(v.plannedStartAt), {
    message: 'plannedEndAt must be after plannedStartAt',
    path: ['plannedEndAt'],
  })
export type JobScheduleInput = z.infer<typeof jobScheduleSchema>

export const maintenanceWindowSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(2000).nullable().optional(),
    /** true = book despite conflicts with scheduled jobs (audited) */
    force: z.boolean().default(false),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  })

// ---------- Shipments ----------

export const shipmentItemInputSchema = z.object({
  orderItemId: cuidSchema,
  quantity: z.number().int().min(1).max(99),
})

export const shipmentCreateSchema = z.object({
  orderId: cuidSchema,
  items: z.array(shipmentItemInputSchema).min(1).max(50),
  weightGrams: z.number().int().min(1).max(100_000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
})

export const shipmentStatusSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  note: z.string().trim().max(1000).optional(),
})

export const shipmentShipSchema = z.object({
  carrier: z.enum(CARRIERS),
  trackingNumber: z.string().trim().min(4).max(64),
})

// ---------- Customer portal (magic link) ----------

export const portalLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  orderNumber: z.string().trim().max(40).optional(),
  locale: localeSchema.default('de'),
})
export type PortalLinkRequestInput = z.infer<typeof portalLinkRequestSchema>

// ---------- Saved configurations (configurator) ----------

export const savedConfigurationSchema = z.object({
  productId: cuidSchema,
  selectedColors: z
    .record(colorZoneSlotSchema, cuidSchema)
    .refine((sel) => Object.keys(sel).length > 0, 'At least one color zone is required'),
})
export type SavedConfigurationInput = z.infer<typeof savedConfigurationSchema>

// ---------- Reviews ----------

export const reviewCreateSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  orderItemId: cuidSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10).max(2000),
  displayName: z.string().trim().min(2).max(40),
  locale: localeSchema.default('de'),
})
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>

export const reviewModerateSchema = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
  internalNote: z.string().trim().max(4000).nullable().optional(),
  flaggedAbuse: z.boolean().optional(),
})
export type ReviewModerateInput = z.infer<typeof reviewModerateSchema>

// ---------- Conversion tracking ----------
export * from './track.js'
