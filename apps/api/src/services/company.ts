import type { ShopSettings } from '@prisma/client'
import { env, isProduction } from '../env.js'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../middleware/error.js'

/** Company identity + bank details as printed on invoices, delivery notes and payment instructions. */
export interface Company {
  name: string
  owner: string
  street: string
  zip: string
  city: string
  email: string
  phone: string
  website: string
  taxNumber: string
  accountHolder: string
  iban: string
  bic: string
  /** Optional: every invoice email goes here as BCC (e.g. bookkeeping inbox). */
  invoiceBcc: string
}

export type CompanyField = keyof Company

/** Company field → ShopSettings column. */
export const COMPANY_COLUMNS = {
  name: 'companyName',
  owner: 'companyOwner',
  street: 'companyStreet',
  zip: 'companyZip',
  city: 'companyCity',
  email: 'companyEmail',
  phone: 'companyPhone',
  website: 'companyWebsite',
  taxNumber: 'companyTaxNumber',
  accountHolder: 'bankAccountHolder',
  iban: 'bankIban',
  bic: 'bankBic',
  invoiceBcc: 'invoiceBccEmail',
} as const satisfies Record<CompanyField, keyof ShopSettings>

export function companyFromEnv(): Company {
  return {
    name: env.COMPANY_NAME,
    owner: env.COMPANY_OWNER,
    street: env.COMPANY_STREET,
    zip: env.COMPANY_ZIP,
    city: env.COMPANY_CITY,
    email: env.COMPANY_EMAIL,
    phone: env.COMPANY_PHONE,
    website: env.COMPANY_WEBSITE,
    taxNumber: env.COMPANY_TAX_NUMBER,
    accountHolder: env.BANK_ACCOUNT_HOLDER,
    iban: env.BANK_IBAN,
    bic: env.BANK_BIC,
    invoiceBcc: '',
  }
}

/** Example defaults from env.ts — must never reach a real invoice (§14 UStG, GiroCode). */
const PLACEHOLDERS: Omit<Company, 'invoiceBcc'> = {
  name: 'Print Shop GmbH',
  owner: 'Max Mustermann',
  street: 'Musterstraße 1',
  zip: '12345',
  city: 'Berlin',
  email: 'info@example.com',
  phone: '+49 30 0000000',
  website: 'www.example.com',
  taxNumber: '12/345/67890',
  accountHolder: 'Print Shop GmbH',
  iban: 'DE00 0000 0000 0000 0000 00',
  bic: 'XXXXDEXXXXX',
}

/** Required fields that are still the example default, or empty (website is optional). */
export function missingCompanyFields(c: Company): CompanyField[] {
  return (Object.keys(PLACEHOLDERS) as (keyof typeof PLACEHOLDERS)[]).filter(
    (k) => k !== 'website' && (c[k] === PLACEHOLDERS[k] || c[k].trim() === ''),
  )
}

/** DB values win; NULL/empty columns fall back to env. */
export function mergeCompany(
  row: Partial<ShopSettings> | null,
  fallback = companyFromEnv(),
): Company {
  const out = { ...fallback }
  for (const [field, column] of Object.entries(COMPANY_COLUMNS) as [
    CompanyField,
    keyof ShopSettings,
  ][]) {
    const value = row?.[column]
    if (typeof value === 'string' && value.trim() !== '') out[field] = value
  }
  // Optional, so the example default is dropped instead of printed on invoices.
  if (out.website === PLACEHOLDERS.website) out.website = ''
  return out
}

// ponytail: per-process cache, fine for the single API container per env; with
// several instances, reload in company() or invalidate via LISTEN/NOTIFY.
let cached: Company = companyFromEnv()

/** Current company data (sync — used inside DTO mappers and PDF renderers). */
export function company(): Company {
  return cached
}

export async function loadCompanySettings(): Promise<Company> {
  const row = await prisma.shopSettings.findUnique({ where: { id: 'singleton' } })
  cached = mergeCompany(row)
  return cached
}

/** Refuses new orders in production while invoices would carry placeholder data. */
export function assertCompanyComplete(): void {
  if (isProduction && missingCompanyFields(cached).length > 0) {
    throw new ApiError(503, 'Shop is not accepting orders yet', 'shop_not_ready')
  }
}
