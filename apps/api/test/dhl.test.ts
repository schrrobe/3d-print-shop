import { describe, expect, it } from 'vitest'
import { SHIPPING_COUNTRIES } from '@print-shop/utils'
import { ALPHA3, parseCreateResponse, toDhlShipment, type LabelOrder } from '../src/services/dhl.js'

const shipper = {
  name: 'Print Shop GmbH',
  street: 'Musterstraße 1',
  zip: '12345',
  city: 'Berlin',
  email: 'info@example.com',
}

function order(overrides: Partial<LabelOrder> = {}): LabelOrder {
  return {
    orderNumber: 'PS-2026-00000001',
    firstName: 'Erika',
    lastName: 'Muster',
    company: null,
    street: 'Hauptstraße 12a',
    zip: '10115',
    city: 'Berlin',
    country: 'DE',
    email: 'erika@example.com',
    carrierEmailConsentAt: null,
    shippingCents: 1500,
    ...overrides,
  }
}

const items = [
  { quantity: 2, unitPriceCents: 1990 },
  { quantity: 1, unitPriceCents: 0 },
]

describe('toDhlShipment', () => {
  it('ships domestic as V01PAK without customs and without email by default', () => {
    const s = toDhlShipment(order(), items, 900, shipper)
    expect(s.product).toBe('V01PAK')
    expect(s.consignee).toEqual({
      name1: 'Erika Muster',
      addressStreet: 'Hauptstraße 12a',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DEU',
    })
    expect(s.details).toEqual({ weight: { uom: 'g', value: 900 } })
    expect('customs' in s).toBe(false)
  })

  it('passes the email only with the checkout opt-in, company as name1', () => {
    const s = toDhlShipment(
      order({ carrierEmailConsentAt: new Date(), company: 'ACME', country: 'at' }),
      items,
      900,
      shipper,
    )
    expect(s.product).toBe('V53WPAK')
    expect(s.consignee).toMatchObject({
      name1: 'ACME',
      name2: 'Erika Muster',
      country: 'AUT',
      email: 'erika@example.com',
    })
    expect('customs' in s).toBe(false)
  })

  it('adds a CN23 for Switzerland whose item weights stay within the parcel weight', () => {
    const s = toDhlShipment(order({ country: 'CH' }), items, 1000, shipper)
    expect(s.customs?.postalCharges).toEqual({ currency: 'EUR', value: 15 })
    expect(s.customs?.items).toEqual([
      expect.objectContaining({
        itemDescription: 'Plastic storage box (3D printed)',
        packagedQuantity: 2,
        hsCode: '39269097',
        countryOfOrigin: 'DEU',
        itemValue: { currency: 'EUR', value: 19.9 },
        itemWeight: { uom: 'g', value: 333 },
      }),
      expect.objectContaining({ itemValue: { currency: 'EUR', value: 0.01 } }),
    ])
    const declared = s.customs!.items.reduce(
      (sum, i) => sum + i.itemWeight.value * i.packagedQuantity,
      0,
    )
    expect(declared).toBeLessThanOrEqual(1000)
  })

  it('maps every checkout delivery country to DHL alpha-3', () => {
    expect(SHIPPING_COUNTRIES.filter((c) => !ALPHA3[c])).toEqual([])
  })

  it('adds a CN23 for Iceland (outside the EU customs union) but not for EU countries', () => {
    expect(toDhlShipment(order({ country: 'IS' }), items, 900, shipper).customs).toBeDefined()
    expect('customs' in toDhlShipment(order({ country: 'SE' }), items, 900, shipper)).toBe(false)
  })

  it('rejects countries the shop does not deliver to', () => {
    expect(() => toDhlShipment(order({ country: 'US' }), items, 900, shipper)).toThrow(/US/)
  })
})

describe('parseCreateResponse', () => {
  it('returns shipment number, PDF and warnings', () => {
    const res = parseCreateResponse(200, {
      items: [
        {
          shipmentNo: '00340434161094042557',
          sstatus: { status: 200 },
          label: { b64: Buffer.from('%PDF').toString('base64') },
          validationMessages: [
            {
              property: 'consignee',
              validationMessage: 'Street not found',
              validationState: 'Warning',
            },
          ],
        },
      ],
    })
    expect(res.shipmentNo).toBe('00340434161094042557')
    expect(res.pdf.toString()).toBe('%PDF')
    expect(res.warnings).toEqual(['consignee: Street not found'])
  })

  it('turns DHL validation errors into a 400 with their messages', () => {
    expect(() =>
      parseCreateResponse(400, {
        items: [
          {
            sstatus: { status: 400, detail: 'Bad Request' },
            validationMessages: [
              {
                property: 'consignee.postalCode',
                validationMessage: 'Invalid postal code',
                validationState: 'Error',
              },
            ],
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'DHL: consignee.postalCode: Invalid postal code',
      }),
    )
  })

  it('refuses a shipment number that is unsafe as a file name', () => {
    expect(() =>
      parseCreateResponse(200, {
        items: [{ shipmentNo: '../../x', label: { b64: 'JVBERg==' } }],
      }),
    ).toThrow(expect.objectContaining({ status: 502 }))
  })
})
