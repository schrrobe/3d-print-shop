import type { LegalCompany } from '@print-shop/utils'

/** Company data + shop URL for the shared legal documents. */
export function useLegalCompany(): { company: LegalCompany; shopUrl: string } {
  const config = useRuntimeConfig().public
  return { company: config.company, shopUrl: config.siteUrl }
}
