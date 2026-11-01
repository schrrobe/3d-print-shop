import { describe, expect, it } from 'vitest'
import { getLegalDocument, type LegalDocumentKey } from '../src/legal-texts.js'

const company = {
  name: 'Muster Shop',
  street: 'Teststr. 1',
  zip: '12345',
  city: 'Teststadt',
  email: 'shop@example.com',
  withdrawUrl: 'https://shop.example/withdraw',
}
const keys: LegalDocumentKey[] = ['imprint', 'privacy', 'terms', 'withdrawal']

describe('legal texts', () => {
  it('fills every company placeholder in every locale', () => {
    for (const locale of ['de', 'en', 'fr', 'nl', 'pl', 'cs', 'it']) {
      for (const key of keys) {
        const doc = getLegalDocument(locale, key, company)
        if (!doc) continue
        const all = JSON.stringify(doc)
        expect(all, `${locale}/${key}`).not.toMatch(/\{(name|street|zip|city|email|withdrawUrl)\}/)
      }
    }
  })

  it('names the online withdrawal function in terms and withdrawal policy of every locale', () => {
    for (const locale of ['de', 'en', 'fr', 'nl', 'pl', 'cs', 'it']) {
      for (const key of ['terms', 'withdrawal'] as const) {
        expect(
          JSON.stringify(getLegalDocument(locale, key, company)),
          `${locale}/${key}`,
        ).toContain(company.withdrawUrl)
      }
    }
  })

  it('has no German imprint/privacy data (those are Vue templates)', () => {
    expect(getLegalDocument('de', 'imprint', company)).toBeNull()
  })

  it('serves the English text for every locale other than German', () => {
    const en = getLegalDocument('en', 'terms', company)
    for (const locale of ['fr', 'nl', 'pl', 'cs', 'it', 'xx']) {
      expect(getLegalDocument(locale, 'terms', company), locale).toEqual(en)
    }
    expect(getLegalDocument('de', 'terms', company)).not.toEqual(en)
  })
})
