import { canLoadGa4, canLoadGtm, canLoadMetaPixel, type ConsentState } from './consent.js'

/** Tracking IDs as stored in shop settings; null = not configured. */
export interface TrackingSettings {
  metaPixelId: string | null
  ga4MeasurementId: string | null
  gtmContainerId: string | null
}

export interface TrackingProvider {
  /** analytics-lib plugin name */
  name: 'google-analytics' | 'google-tag-manager' | 'meta-pixel'
  settingKey: keyof TrackingSettings
  allowed: (state: ConsentState | null) => boolean
}

export const TRACKING_PROVIDERS: readonly TrackingProvider[] = [
  { name: 'google-analytics', settingKey: 'ga4MeasurementId', allowed: canLoadGa4 },
  { name: 'google-tag-manager', settingKey: 'gtmContainerId', allowed: canLoadGtm },
  { name: 'meta-pixel', settingKey: 'metaPixelId', allowed: canLoadMetaPixel },
] as const

/** Providers that have an ID configured, regardless of consent. */
export const configuredProviders = (settings: TrackingSettings): TrackingProvider[] =>
  TRACKING_PROVIDERS.filter((p) => Boolean(settings[p.settingKey]))

/** Providers that are configured AND covered by the given consent state. */
export const allowedProviders = (
  settings: TrackingSettings,
  state: ConsentState | null,
): TrackingProvider[] => configuredProviders(settings).filter((p) => p.allowed(state))

const SENSITIVE_TRACKING_PREFIXES = [
  '/admin/',
  '/checkout/success/',
  '/order/',
  '/portal/',
  '/quote/',
  '/support/ticket/',
  '/complaint/',
] as const

/** Token-bearing customer pages must never be sent to third-party analytics providers. */
export function isSensitiveTrackingPath(value: string): boolean {
  const pathname = value.split(/[?#]/, 1)[0] || '/'
  const localeAgnostic = pathname.replace(/^\/(?:de|en|pl|fr|nl|cs)(?=\/|$)/, '') || '/'
  if (localeAgnostic === '/admin') return true
  return SENSITIVE_TRACKING_PREFIXES.some(
    (prefix) => localeAgnostic === prefix.replace(/\/$/, '') || localeAgnostic.startsWith(prefix),
  )
}

/**
 * Normalize a path for analytics storage: drop any query/hash, cap length, and
 * blank out token-bearing sensitive paths. `sensitiveFallback` is returned for a
 * sensitive or empty input — null for nullable event paths, '/' for the NOT NULL
 * session landing path. Single source of truth; the client mirrors this shape.
 */
export function sanitizeTrackingPath(
  value: string | null | undefined,
  sensitiveFallback: string | null = null,
): string | null {
  if (!value || isSensitiveTrackingPath(value)) return sensitiveFallback
  return (value.split(/[?#]/, 1)[0] || '/').slice(0, 512)
}
