import { describe, expect, it } from 'vitest'
import {
  DELIVERY_COUNTRIES,
  legalDocumentText,
  termsDocument,
  WITHDRAWAL_FUNCTION_PATH,
  withdrawalDocument,
} from '../src/legal-documents.js'
import { formatCents } from '../src/money.js'
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from '../src/shipping.js'

const company = {
  name: 'Robert Schreiner',
  street: 'Kapitelwiese 14',
  zip: '44263',
  city: 'Dortmund',
  email: 'info@example.de',
}
const shop = 'https://kaliberbox.de'

describe('legal documents', () => {
  const terms = legalDocumentText(termsDocument(company, shop))
  const withdrawal = legalDocumentText(withdrawalDocument(company, shop))

  it('AGB quote the shipping cost the checkout actually charges', () => {
    expect(terms).toContain(formatCents(SHIPPING_FLAT_CENTS, 'de'))
    expect(terms).toContain(formatCents(FREE_SHIPPING_THRESHOLD_CENTS, 'de'))
  })

  it('AGB name every checkout delivery country and the order button label', () => {
    expect(DELIVERY_COUNTRIES).toHaveLength(12)
    expect(terms).toContain('Schweiz')
    expect(terms).toContain('„Jetzt kostenpflichtig bestellen“')
  })

  it('withdrawal policy points to the § 356a BGB function and keeps the model form', () => {
    expect(withdrawal).toContain(`${shop}${WITHDRAWAL_FUNCTION_PATH}`)
    expect(withdrawal).toContain('„Vertrag widerrufen“')
    expect(withdrawal).toContain('Datum und Uhrzeit ihres Eingangs')
    expect(withdrawal).toContain('Muster-Widerrufsformular')
    expect(withdrawal).toContain(company.street)
  })

  it('restricts the § 312g exclusion to made-to-spec work, not colour choice', () => {
    expect(withdrawal).toContain('§ 312g Abs. 2 Nr. 1 BGB')
    expect(withdrawal).toMatch(/Patronenboxen aus unserem Sortiment besteht das Widerrufsrecht/)
  })

  it('contains no reference to the discontinued EU ODR platform', () => {
    expect(terms + withdrawal).not.toMatch(/ec\.europa\.eu\/consumers\/odr|OS-Plattform/)
  })
})
