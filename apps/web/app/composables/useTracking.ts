import type { ClientEventName } from '@print-shop/utils'

/**
 * Access the first-party conversion tracker. Safe on the server (returns no-ops)
 * and before consent (the tracker itself no-ops until statistics consent).
 */
export interface ShopTracking {
  track: (name: ClientEventName, props?: Record<string, string | number | boolean | null>) => void
  flush: () => Promise<void>
  sessionId: () => string | null
}

export function useTracking(): ShopTracking {
  const nuxt = useNuxtApp()
  const t = nuxt.$shopTracking as ShopTracking | undefined
  return t ?? { track: () => {}, flush: () => Promise.resolve(), sessionId: () => null }
}
