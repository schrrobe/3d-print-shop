/**
 * Marketing-channel classification for attribution. Pure and table-driven so it
 * can be unit-tested and reused on both the client (session capture) and the
 * server (attribution computation).
 */

export const TRACKING_CHANNELS = [
  'meta_ads',
  'tiktok_ads',
  'google_ads',
  'organic',
  'referral',
  'email',
  'direct',
] as const
export type TrackingChannel = (typeof TRACKING_CHANNELS)[number]

export interface Touchpoint {
  utmSource?: string | null
  utmMedium?: string | null
  fbclid?: string | null
  ttclid?: string | null
  gclid?: string | null
  /** Referrer host (no scheme, no path), e.g. "www.google.com". */
  referrerHost?: string | null
}

const SEARCH_ENGINE_HOSTS = ['google.', 'bing.', 'duckduckgo.', 'ecosia.', 'yahoo.', 'startpage.']
const PAID_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsocial', 'paid-social', 'display', 'ads']

/**
 * Priority: click id (unambiguously paid) > utm source/medium > referrer > direct.
 * Click ids win because they only appear on paid ad clicks and survive utm loss.
 */
export function classifyChannel(tp: Touchpoint): TrackingChannel {
  if (tp.ttclid) return 'tiktok_ads'
  if (tp.fbclid) return 'meta_ads'
  if (tp.gclid) return 'google_ads'

  const source = (tp.utmSource ?? '').trim().toLowerCase()
  const medium = (tp.utmMedium ?? '').trim().toLowerCase()
  const paid = PAID_MEDIUMS.includes(medium)
  if (source) {
    if (/(tiktok)/.test(source)) return paid ? 'tiktok_ads' : 'referral'
    if (/(facebook|instagram|meta|fb|ig)/.test(source)) return paid ? 'meta_ads' : 'referral'
    if (/(google|adwords)/.test(source)) return paid ? 'google_ads' : 'organic'
    if (medium === 'email' || medium === 'newsletter' || source === 'email') return 'email'
    if (medium === 'organic') return 'organic'
    if (paid) return 'referral'
    return 'referral'
  }

  // Bare referrer with no campaign tagging: a search engine reads as organic,
  // anything else (incl. unpaid social) as a plain referral. Paid traffic is
  // only ever inferred from click ids / utm above, never from the referrer.
  const host = (tp.referrerHost ?? '').trim().toLowerCase().replace(/^www\./, '')
  if (host) {
    if (SEARCH_ENGINE_HOSTS.some((h) => host.startsWith(h.replace(/^www\./, '')))) return 'organic'
    return 'referral'
  }

  return 'direct'
}

/** Extract the bare host from a referrer URL string (empty on failure). */
export function referrerHost(referrer: string | null | undefined): string {
  if (!referrer) return ''
  try {
    return new URL(referrer).host
  } catch {
    return ''
  }
}
