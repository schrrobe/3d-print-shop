import { describe, expect, it } from 'vitest'
import { buyerCountries, buyerLocations } from '../src/services/buyer-locations.js'

describe('buyerLocations', () => {
  it('groups orders per postcode centroid and drops unknown postcodes', () => {
    const places = buyerLocations([
      { country: 'DE', zip: '10115' },
      { country: 'de', zip: ' 10115 ' },
      { country: 'CH', zip: '8001' },
      { country: 'DE', zip: '00000' },
      { country: 'US', zip: '10115' },
    ])
    expect(places).toHaveLength(2)
    expect(places.map((p) => p.count).sort()).toEqual([1, 2])
    for (const p of places) {
      expect(p.lat).toBeGreaterThan(45)
      expect(p.lon).toBeGreaterThan(5)
    }
  })

  it('finds postcodes outside DACH whatever way they are written', () => {
    const places = buyerLocations([
      { country: 'NL', zip: '1011 AB' },
      { country: 'LU', zip: 'L-4968' },
      { country: 'PL', zip: '59700' },
      { country: 'CZ', zip: '110 00' },
    ])
    expect(places).toHaveLength(4)
  })

  it('lists every order country once, even without a known postcode', () => {
    expect(buyerCountries([{ country: 'de' }, { country: 'DE ' }, { country: 'US' }])).toEqual(['DE', 'US'])
  })
})
