import { describe, expect, it } from 'vitest'
import { canonicalColorSelection, lineKey } from '../src/line-key.js'

describe('canonicalColorSelection', () => {
  it('is independent of key order', () => {
    expect(canonicalColorSelection({ body: 'c1', lid: 'c2' })).toBe(
      canonicalColorSelection({ lid: 'c2', body: 'c1' }),
    )
  })

  it('different colors produce different keys', () => {
    expect(canonicalColorSelection({ body: 'c1' })).not.toBe(canonicalColorSelection({ body: 'c2' }))
  })

  it('different zones produce different keys', () => {
    expect(canonicalColorSelection({ body: 'c1' })).not.toBe(canonicalColorSelection({ lid: 'c1' }))
  })
})

describe('lineKey', () => {
  it('merges identical configurations across cart and wishlist', () => {
    expect(lineKey('prod1', { a: 'x', b: 'y' })).toBe(lineKey('prod1', { b: 'y', a: 'x' }))
  })

  it('separates products and configurations', () => {
    expect(lineKey('prod1', { a: 'x' })).not.toBe(lineKey('prod2', { a: 'x' }))
    expect(lineKey('prod1', { a: 'x' })).not.toBe(lineKey('prod1', { a: 'y' }))
  })
})
