import {
  acceptAllConsent,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  canLoadGa4,
  canLoadMetaPixel,
  createConsent,
  parseStoredConsent,
  rejectAllConsent,
  type ConsentState,
} from '@print-shop/utils'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** GDPR consent — banner state, persistence, backend consent log. */
export const useConsentStore = defineStore('consent', () => {
  const consent = ref<ConsentState | null>(null)
  const hydrated = ref(false)
  const settingsOpen = ref(false)

  function hydrate() {
    if (hydrated.value || typeof window === 'undefined') return
    consent.value = parseStoredConsent(localStorage.getItem(CONSENT_STORAGE_KEY))
    hydrated.value = true
  }

  const bannerVisible = computed(() => hydrated.value && consent.value === null)
  const ga4Allowed = computed(() => canLoadGa4(consent.value))
  const metaPixelAllowed = computed(() => canLoadMetaPixel(consent.value))

  async function persist(state: ConsentState, locale: string) {
    consent.value = state
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))
    let anonymousId = localStorage.getItem('print-shop-anon-id')
    if (!anonymousId) {
      anonymousId = crypto.randomUUID()
      localStorage.setItem('print-shop-anon-id', anonymousId)
    }
    // Consent log — fire and forget, must never block the UI
    try {
      await $fetch('/api/consent', {
        method: 'POST',
        body: {
          anonymousId,
          categories: {
            necessary: true,
            statistics: state.statistics,
            marketing: state.marketing,
          },
          version: CONSENT_VERSION,
          locale,
        },
      })
    } catch (err) {
      console.warn('[consent] log failed', err)
    }
  }

  const acceptAll = (locale: string) => persist(acceptAllConsent(), locale)
  const rejectAll = (locale: string) => persist(rejectAllConsent(), locale)
  const saveCustom = (choices: { statistics: boolean; marketing: boolean }, locale: string) =>
    persist(createConsent(choices), locale)

  return {
    consent,
    hydrate,
    bannerVisible,
    settingsOpen,
    ga4Allowed,
    metaPixelAllowed,
    acceptAll,
    rejectAll,
    saveCustom,
  }
})
