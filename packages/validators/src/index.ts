import {
  CARRIERS,
  COLOR_ZONE_SLOTS,
  CONSENT_CATEGORIES,
  LOCALES,
  PAYMENT_METHODS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  USER_ROLES,
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

export const checkoutSchema = z.object({
  items: z.array(cartItemInputSchema).min(1).max(50),
  address: addressSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  locale: localeSchema.default('de'),
  note: z.string().trim().max(1000).optional(),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

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
  printDurationMinutes: z.number().int().min(1).max(60 * 24 * 14),
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
