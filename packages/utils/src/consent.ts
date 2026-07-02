import type { ConsentCategory } from '@print-shop/types'

export const CONSENT_VERSION = '1.0'
export const CONSENT_STORAGE_KEY = 'print-shop-consent'

export interface ConsentState {
  necessary: true
  statistics: boolean
  marketing: boolean
  version: string
  updatedAt: string
}

export function createConsent(
  choices: { statistics: boolean; marketing: boolean },
  now: Date = new Date(),
): ConsentState {
  return {
    necessary: true,
    statistics: choices.statistics,
    marketing: choices.marketing,
    version: CONSENT_VERSION,
    updatedAt: now.toISOString(),
  }
}

export const acceptAllConsent = (now?: Date): ConsentState =>
  createConsent({ statistics: true, marketing: true }, now)

export const rejectAllConsent = (now?: Date): ConsentState =>
  createConsent({ statistics: false, marketing: false }, now)

/** Trackers may only load after explicit opt-in for their category. */
export function canLoadTracker(category: ConsentCategory, state: ConsentState | null): boolean {
  if (category === 'necessary') return true
  if (!state) return false
  if (state.version !== CONSENT_VERSION) return false
  return state[category] === true
}

/** GA4 requires statistics consent; Meta Pixel requires marketing consent. */
export const canLoadGa4 = (state: ConsentState | null): boolean => canLoadTracker('statistics', state)
export const canLoadMetaPixel = (state: ConsentState | null): boolean => canLoadTracker('marketing', state)

export function parseStoredConsent(raw: string | null): ConsentState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.statistics !== 'boolean' ||
      typeof parsed.marketing !== 'boolean' ||
      typeof parsed.version !== 'string'
    ) {
      return null
    }
    return {
      necessary: true,
      statistics: parsed.statistics,
      marketing: parsed.marketing,
      version: parsed.version,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    }
  } catch {
    return null
  }
}
