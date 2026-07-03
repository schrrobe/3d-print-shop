// Shared domain types & enums — mirrored by the Prisma schema (apps/api/prisma/schema.prisma).
// Enum values are stable English snake_case keys; human-readable labels come from i18n.

export const LOCALES = ['de', 'en', 'pl', 'fr', 'nl', 'cs'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'de'

export const ORDER_STATUSES = [
  'pending',
  'awaiting_payment',
  'awaiting_bank_transfer',
  'paid',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_METHODS = ['stripe', 'stripe_payment_link', 'bank_transfer', 'bitcoin'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'expired',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const BITCOIN_PAYMENT_STATUSES = [
  'awaiting_payment',
  'unconfirmed',
  'confirming',
  'paid',
  'underpaid',
  'expired',
] as const
export type BitcoinPaymentStatus = (typeof BITCOIN_PAYMENT_STATUSES)[number]

export const QUOTE_REQUEST_STATUSES = [
  'new',
  'in_review',
  'quoted',
  'accepted',
  'rejected',
  'cancelled',
] as const
export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number]

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

/** Druckerstatus: frei, vorbereitet, druckt, pausiert, fehler, wartung */
export const PRINTER_STATUSES = [
  'idle',
  'prepared',
  'printing',
  'paused',
  'error',
  'maintenance',
] as const
export type PrinterStatus = (typeof PRINTER_STATUSES)[number]

/** Produktionsstatus: wartet, zugewiesen, druckt, fertig, qualitätsprüfung, versandbereit, versendet, fehlgeschlagen, reprint_nötig */
export const PRODUCTION_STATUSES = [
  'waiting',
  'assigned',
  'printing',
  'printed',
  'quality_check',
  'ready_to_ship',
  'shipped',
  'failed',
  'reprint_needed',
] as const
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number]

export const USER_ROLES = ['admin', 'product_manager', 'production', 'shipping', 'support'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const CONSENT_CATEGORIES = ['necessary', 'statistics', 'marketing'] as const
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number]

/** Ticketstatus: offen, in Bearbeitung, wartet auf Kunde, gelöst, geschlossen */
export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const TICKET_CATEGORIES = ['order', 'payment', 'shipping', 'product', 'other'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const TICKET_AUTHOR_TYPES = ['customer', 'staff'] as const
export type TicketAuthorType = (typeof TICKET_AUTHOR_TYPES)[number]

export const ASSET_TYPES = ['image', 'glb_preview', 'production_file'] as const
export type AssetType = (typeof ASSET_TYPES)[number]

export const CARRIERS = ['dhl', 'hermes'] as const
export type Carrier = (typeof CARRIERS)[number]

export const UPLOAD_FILE_TYPES = ['stl', '3mf'] as const
export type UploadFileType = (typeof UPLOAD_FILE_TYPES)[number]

/** Color zone slot names as used in GLB mesh/material names. */
export const COLOR_ZONE_SLOTS = ['zone_1_main', 'zone_2_accent', 'zone_3_detail', 'zone_4_text'] as const
export type ColorZoneSlot = (typeof COLOR_ZONE_SLOTS)[number]
export const MAX_COLOR_ZONES = 4

// ---------- DTOs shared between web and api ----------

export interface ColorDto {
  id: string
  name: string
  hex: string
  material: string
  manufacturer: string
  active: boolean
  stockGrams: number | null
  amsSlot: number | null
}

export interface ProductColorSlotDto {
  id: string
  slot: ColorZoneSlot
  label: string
  defaultColorId: string | null
}

export interface ProductTranslationDto {
  locale: Locale
  name: string
  description: string
  seoTitle: string | null
  seoDescription: string | null
}

export interface ProductAssetDto {
  id: string
  type: AssetType
  url: string
  alt: string | null
  sortOrder: number
}

export interface ProductDto {
  id: string
  slug: string
  priceCents: number
  active: boolean
  translations: ProductTranslationDto[]
  assets: ProductAssetDto[]
  colorSlots: ProductColorSlotDto[]
}

/** Selected colors per zone slot for a configured cart/order item. */
export type ColorSelection = Partial<Record<ColorZoneSlot, string>>

export interface CartItemDto {
  id: string
  productId: string
  quantity: number
  unitPriceCents: number
  colorSelection: ColorSelection
}

export interface CartTotalsDto {
  subtotalCents: number
  shippingCents: number
  totalCents: number
  freeShippingApplied: boolean
}

export interface AddressDto {
  firstName: string
  lastName: string
  company?: string
  street: string
  zip: string
  city: string
  country: string
  email: string
  phone?: string
}

export interface ConsentStateDto {
  necessary: true
  statistics: boolean
  marketing: boolean
  version: string
  updatedAt: string
}

export interface TicketMessageDto {
  id: string
  authorType: TicketAuthorType
  /** Staff display name; null for customer messages. */
  authorName: string | null
  body: string
  createdAt: string
}

/** Public (token page) shape of a ticket. */
export interface TicketDto {
  ticketNumber: string
  status: TicketStatus
  category: TicketCategory
  subject: string
  orderNumber: string | null
  createdAt: string
  messages: TicketMessageDto[]
}
