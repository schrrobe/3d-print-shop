import { companySettingsSchema } from '@print-shop/validators'
import { describe, expect, it } from 'vitest'
import { companyFromEnv, mergeCompany, missingCompanyFields } from '../src/services/company.js'

const real = {
  name: 'Kaliberbox',
  owner: 'Robert Schreiner',
  street: 'Kapitelwiese 14',
  zip: '44000',
  city: 'Dortmund',
  email: 'info@kaliberbox.de',
  phone: '+49 231 000000',
  website: '',
  taxNumber: '315/000/00000',
  accountHolder: 'Robert Schreiner',
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  invoiceBcc: '',
}

describe('company settings', () => {
  it('flags env placeholders as missing, accepts real data with empty website', () => {
    expect(missingCompanyFields(companyFromEnv())).toContain('iban')
    expect(missingCompanyFields(real)).toEqual([])
    expect(missingCompanyFields({ ...real, phone: '  ' })).toEqual(['phone'])
  })

  it('prefers DB values and falls back to env for NULL or blank columns', () => {
    const merged = mergeCompany(
      { companyName: 'Kaliberbox', bankIban: null, companyCity: ' ' },
      real,
    )
    expect(merged.name).toBe('Kaliberbox')
    expect(merged.iban).toBe(real.iban)
    expect(merged.city).toBe(real.city)
    expect(mergeCompany(null, real)).toEqual(real)
  })

  it('normalizes input: blank clears, IBAN/BIC uppercased and validated', () => {
    const parsed = companySettingsSchema.parse({
      ...real,
      website: '  ',
      iban: 'de89 3704 0044 0532 0130 00',
      bic: 'cobadeffxxx',
    })
    expect(parsed.website).toBeNull()
    expect(parsed.iban).toBe('DE89 3704 0044 0532 0130 00')
    expect(parsed.bic).toBe('COBADEFFXXX')
    expect(companySettingsSchema.safeParse({ ...real, iban: 'not-an-iban' }).success).toBe(false)
    expect(parsed.invoiceBcc).toBeNull()
    expect(companySettingsSchema.safeParse({ ...real, invoiceBcc: 'buchhaltung' }).success).toBe(
      false,
    )
  })
})
