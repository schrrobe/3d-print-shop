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
    expect(missingCompanyFields({ ...real, bic: '  ' })).toEqual(['bic'])
    expect(missingCompanyFields({ ...real, phone: '' })).toEqual([])
    expect(mergeCompany(null, { ...real, phone: '+49 30 0000000' }).phone).toBe('')
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

  it('drops the placeholder website so a blank website does not block orders', () => {
    const merged = mergeCompany(null, { ...real, website: 'www.example.com' })
    expect(merged.website).toBe('')
    expect(missingCompanyFields(merged)).toEqual([])
    expect(missingCompanyFields({ ...real, website: 'www.example.com' })).toEqual([])
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
    // Right shape, wrong check digits / wrong length / unknown country.
    for (const iban of [
      'DE00 0000 0000 0000 0000 01',
      'DE89 3704 0044 0532 0130 0',
      'XX89 3704 0044 0532 0130 00',
    ])
      expect(companySettingsSchema.safeParse({ ...real, iban }).success).toBe(false)
    // SWIFT registry examples for the SEPA countries added in 2023+.
    for (const iban of [
      'AL47 2121 1009 0000 0002 3569 8741',
      'MD24 AG00 0225 1000 1310 4168',
      'ME25 5050 0001 2345 6789 51',
      'MK07 2501 2000 0058 984',
      'RS35 2600 0560 1001 6113 79',
    ])
      expect(companySettingsSchema.safeParse({ ...real, iban }).success).toBe(true)
    expect(parsed.invoiceBcc).toBeNull()
    expect(companySettingsSchema.safeParse({ ...real, invoiceBcc: 'buchhaltung' }).success).toBe(
      false,
    )
  })
})
