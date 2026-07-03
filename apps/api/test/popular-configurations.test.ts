import { describe, expect, it } from 'vitest'
import { aggregatePopularConfigurations } from '../src/services/popular-configurations.js'

const colors = [
  { id: 'green', hex: '#31a871', name: 'Brand Green', active: true, outOfStock: false },
  { id: 'black', hex: '#111111', name: 'Schwarz', active: true, outOfStock: false },
  { id: 'orange', hex: '#ff6a00', name: 'Neon Orange', active: false, outOfStock: false },
  { id: 'blue', hex: '#1e6fd9', name: 'Ocean Blue', active: true, outOfStock: true },
]

describe('aggregatePopularConfigurations', () => {
  it('only surfaces combos ordered at least twice (privacy threshold)', () => {
    const result = aggregatePopularConfigurations(
      [
        { body: 'green', lid: 'black' },
        { body: 'green', lid: 'black' },
        { body: 'black', lid: 'green' }, // unique combo of one single customer
      ],
      colors,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.count).toBe(2)
    expect(result[0]?.selectedColors).toEqual({ body: 'green', lid: 'black' })
  })

  it('merges selections regardless of key order (canonical key)', () => {
    const result = aggregatePopularConfigurations(
      [
        { body: 'green', lid: 'black' },
        { lid: 'black', body: 'green' },
      ],
      colors,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.count).toBe(2)
  })

  it('sorts by count descending and respects take', () => {
    const twice = { body: 'green' }
    const thrice = { body: 'black' }
    const result = aggregatePopularConfigurations(
      [twice, twice, thrice, thrice, thrice],
      colors,
      { take: 1 },
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.selectedColors).toEqual(thrice)
    expect(result[0]?.count).toBe(3)
  })

  it('marks combos with inactive or out-of-stock colors as unavailable', () => {
    const result = aggregatePopularConfigurations(
      [
        { body: 'orange' },
        { body: 'orange' },
        { body: 'blue' },
        { body: 'blue' },
        { body: 'green' },
        { body: 'green' },
      ],
      colors,
    )
    const byColor = Object.fromEntries(result.map((r) => [r.selectedColors.body, r.available]))
    expect(byColor.orange).toBe(false) // inactive
    expect(byColor.blue).toBe(false) // out of stock
    expect(byColor.green).toBe(true)
  })

  it('includes swatch data per zone', () => {
    const result = aggregatePopularConfigurations(
      [
        { body: 'green', lid: 'black' },
        { body: 'green', lid: 'black' },
      ],
      colors,
    )
    expect(result[0]?.swatches).toEqual([
      { slot: 'body', colorId: 'green', hex: '#31a871', name: 'Brand Green' },
      { slot: 'lid', colorId: 'black', hex: '#111111', name: 'Schwarz' },
    ])
  })

  it('ignores empty selections', () => {
    expect(aggregatePopularConfigurations([{}, {}], colors)).toEqual([])
  })
})
