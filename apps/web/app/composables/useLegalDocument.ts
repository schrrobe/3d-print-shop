import { getLegalDocument, WITHDRAW_PATH, type LegalDocumentKey } from '@print-shop/utils'

/** Legal document for the current locale, company data from runtime config. */
export function useLegalDocument(key: LegalDocumentKey) {
  const { locale } = useI18n()
  const { company, siteUrl } = useRuntimeConfig().public
  const localePath = useLocalePath()
  return computed(() =>
    getLegalDocument(locale.value, key, {
      ...company,
      withdrawUrl: `${siteUrl}${localePath(WITHDRAW_PATH)}`,
    }),
  )
}
