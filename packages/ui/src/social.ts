import type { SocialPlatform, SocialPostStatus } from '@print-shop/types'

/** View model shared by the social planner components (list, calendar, cards, preview). */
export interface SocialPostItem {
  id: string
  platform: SocialPlatform
  status: SocialPostStatus
  caption: string
  mediaUrls: string[]
  productName?: string | null
  productUrl?: string | null
  scheduledAt?: string | null
  publishedAt?: string | null
  errorMessage?: string | null
  attempts?: number
}

/** German admin labels (the admin area is German-only, like orders/tickets). */
export const SOCIAL_POST_STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  publishing: 'Wird veröffentlicht',
  published: 'Veröffentlicht',
  failed: 'Fehlgeschlagen',
  cancelled: 'Abgebrochen',
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
}

/** Formats an ISO/UTC timestamp in the admin's local timezone. */
export function formatSocialDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
