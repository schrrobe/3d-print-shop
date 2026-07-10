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

export const PAYMENT_METHODS = [
  'stripe',
  'stripe_payment_link',
  'bank_transfer',
  'bitcoin',
] as const
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
export const COLOR_ZONE_SLOTS = [
  'zone_1_main',
  'zone_2_accent',
  'zone_3_detail',
  'zone_4_text',
] as const
export type ColorZoneSlot = (typeof COLOR_ZONE_SLOTS)[number]
export const MAX_COLOR_ZONES = 4

/** Max product gallery photos per product (enforced client- and server-side). */
export const MAX_PRODUCT_IMAGES = 4

/** Social-Media-Plattformen für den Post-Planner (Meta Graph API). */
export const SOCIAL_PLATFORMS = ['instagram', 'facebook'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

/** Social-Post-Status: Entwurf, geplant, wird veröffentlicht, veröffentlicht, fehlgeschlagen, abgebrochen */
export const SOCIAL_POST_STATUSES = [
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
] as const
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number]

/** Reklamationsstatus: eingereicht, in Prüfung, weitere Infos benötigt, genehmigt, abgelehnt, Ersatzdruck geplant, Erstattung geplant, abgeschlossen */
export const COMPLAINT_STATUSES = [
  'submitted',
  'in_review',
  'info_needed',
  'approved',
  'rejected',
  'replacement_planned',
  'refund_planned',
  'closed',
] as const
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number]

export const COMPLAINT_REASONS = [
  'damaged',
  'wrong_item',
  'quality_issue',
  'missing_parts',
  'color_mismatch',
  'other',
] as const
export type ComplaintReason = (typeof COMPLAINT_REASONS)[number]

/** Entscheidung: Ersatzdruck, Erstattung, Gutschein, Ablehnung, weitere Prüfung */
export const COMPLAINT_RESOLUTIONS = [
  'replacement_print',
  'refund',
  'voucher',
  'rejection',
  'further_review',
] as const
export type ComplaintResolution = (typeof COMPLAINT_RESOLUTIONS)[number]

/** QC-Status: offen, bestanden, fehlgeschlagen, Reprint erforderlich, überschrieben */
export const QC_STATUSES = ['open', 'passed', 'failed', 'reprint_required', 'overridden'] as const
export type QcStatus = (typeof QC_STATUSES)[number]

export const AMS_SLOT_STATUSES = ['empty', 'loaded', 'low', 'error', 'disabled'] as const
export type AmsSlotStatus = (typeof AMS_SLOT_STATUSES)[number]

/** Versandstatus: wartet auf QC, bereit für Versand, verpackt, versendet, zugestellt, Problem */
export const SHIPMENT_STATUSES = [
  'waiting_for_qc',
  'ready_for_shipping',
  'packed',
  'shipped',
  'delivered',
  'problem',
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

/** Bewertungsstatus: ausstehend, freigegeben, abgelehnt, ausgeblendet */
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'hidden'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

/** Gutschein-Typ: prozentual (value = 1–100) oder Festbetrag (value = Cents) */
export const VOUCHER_TYPES = ['percent', 'fixed'] as const
export type VoucherType = (typeof VOUCHER_TYPES)[number]

/** Warum ein Gutschein nicht einlösbar ist (Public-Validate & Checkout). */
export const VOUCHER_REJECTIONS = [
  'not_found',
  'inactive',
  'not_yet_valid',
  'expired',
  'exhausted',
  'min_order_not_met',
] as const
export type VoucherRejection = (typeof VOUCHER_REJECTIONS)[number]

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

// ---------- Admin API DTOs ----------

export interface AdminColorDto {
  id: string
  name: string
  hex: string
  active: boolean
}

export interface AdminProductDetailDto {
  id: string
  slug: string
  priceCents: number
  active: boolean
  translations: ProductTranslationDto[]
  assets: ProductAssetDto[]
  colorSlots: ProductColorSlotDto[]
}

export interface AdminFilamentColorDto {
  id: string
  name: string
  hex: string
}

export interface AdminFilamentSpoolDto {
  id: string
  material: string
  manufacturer: string | null
  label: string | null
  colorId: string | null
  color: AdminFilamentColorDto | null
  remainingGrams: number | null
  totalGrams: number | null
  minRemainingGrams: number | null
  storageLocation: string | null
  active: boolean
  reorder: boolean
  amsSlotAssignment: {
    id: string
    slotIndex: number
    amsUnit: { name: string; printer: { name: string } }
  } | null
}

export interface AdminAmsSlotDto {
  id: string
  slotIndex: number
  status: AmsSlotStatus
  notes: string | null
  spool: (AdminFilamentSpoolDto & { color: AdminFilamentColorDto | null }) | null
}

export interface AdminAmsUnitDto {
  id: string
  name: string
  position: number
  printer: { id: string; name: string; status: string }
  slots: AdminAmsSlotDto[]
}

export interface AdminFilamentAlertsDto {
  lowSpools: AdminFilamentSpoolDto[]
  lowColors: {
    color: AdminFilamentColorDto & { minStockGrams: number | null }
    status: string
    totalRemainingGrams: number
  }[]
}

export interface AdminFilamentShoppingRowDto {
  spoolId: string
  label: string | null
  material: string
  manufacturer: string | null
  colorName: string | null
  colorHex: string | null
  remainingGrams: number | null
  minRemainingGrams: number | null
  reorderFlag: boolean
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

/** Totals including a redeemed voucher (discount 0 when none applies). */
export interface CartTotalsWithVoucherDto extends CartTotalsDto {
  discountCents: number
}

/** Public shape of a redeemable voucher (validate response / cart storage). */
export interface VoucherDto {
  code: string
  type: VoucherType
  value: number
  minOrderCents: number
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
