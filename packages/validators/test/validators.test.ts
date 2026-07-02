import { describe, expect, it } from 'vitest'
import {
  addressSchema,
  checkoutSchema,
  colorCreateSchema,
  consentLogSchema,
  loginSchema,
  productCreateSchema,
  quoteCreateSchema,
  uploadedFileMetaSchema,
  uploadRequestSchema,
} from '../src/index.js'

const validAddress = {
  firstName: 'Max',
  lastName: 'Mustermann',
  street: 'Musterstraße 1',
  zip: '12345',
  city: 'Berlin',
  country: 'DE',
  email: 'max@example.com',
}

describe('addressSchema', () => {
  it('accepts a valid address', () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true)
  })

  it('rejects invalid email and country', () => {
    expect(addressSchema.safeParse({ ...validAddress, email: 'nope' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...validAddress, country: 'DEU' }).success).toBe(false)
  })
})

describe('checkoutSchema', () => {
  const item = { productId: 'prod_1', quantity: 1, colorSelection: { zone_1_main: 'col_1' } }

  it('accepts a valid checkout', () => {
    const result = checkoutSchema.safeParse({
      items: [item],
      address: validAddress,
      paymentMethod: 'stripe',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.locale).toBe('de')
  })

  it('rejects empty carts, bad payment methods and bad zone slots', () => {
    expect(
      checkoutSchema.safeParse({ items: [], address: validAddress, paymentMethod: 'stripe' })
        .success,
    ).toBe(false)
    expect(
      checkoutSchema.safeParse({ items: [item], address: validAddress, paymentMethod: 'paypal' })
        .success,
    ).toBe(false)
    expect(
      checkoutSchema.safeParse({
        items: [{ ...item, colorSelection: { zone_9_bogus: 'col_1' } }],
        address: validAddress,
        paymentMethod: 'bitcoin',
      }).success,
    ).toBe(false)
  })
})

describe('uploadRequestSchema', () => {
  it('accepts a valid request and defaults quantity', () => {
    const result = uploadRequestSchema.safeParse({
      name: 'Max',
      email: 'max@example.com',
      description: 'Bitte in PETG drucken, Schichthöhe 0.2mm.',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.quantity).toBe(1)
  })

  it('rejects too-short descriptions', () => {
    expect(
      uploadRequestSchema.safeParse({ name: 'M', email: 'max@example.com', description: 'kurz' })
        .success,
    ).toBe(false)
  })
})

describe('uploadedFileMetaSchema', () => {
  it('accepts stl/3mf up to 50 MB', () => {
    expect(
      uploadedFileMetaSchema.safeParse({ filename: 'part.3mf', sizeBytes: 52_428_800 }).success,
    ).toBe(true)
  })

  it('rejects wrong types and oversize files', () => {
    expect(uploadedFileMetaSchema.safeParse({ filename: 'part.obj', sizeBytes: 100 }).success).toBe(
      false,
    )
    expect(
      uploadedFileMetaSchema.safeParse({ filename: 'part.stl', sizeBytes: 52_428_801 }).success,
    ).toBe(false)
  })
})

describe('quoteCreateSchema', () => {
  it('requires a positive price', () => {
    expect(
      quoteCreateSchema.safeParse({ quoteRequestId: 'qr_1', priceCents: 0 }).success,
    ).toBe(false)
    const result = quoteCreateSchema.safeParse({ quoteRequestId: 'qr_1', priceCents: 4999 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.validDays).toBe(14)
  })
})

describe('productCreateSchema', () => {
  it('enforces kebab-case slugs and max 4 color slots', () => {
    const base = {
      priceCents: 1999,
      translations: [{ locale: 'de', name: 'Vase', description: 'Eine Vase' }],
      colorSlots: [],
    }
    expect(productCreateSchema.safeParse({ ...base, slug: 'spiral-vase' }).success).toBe(true)
    expect(productCreateSchema.safeParse({ ...base, slug: 'Spiral Vase' }).success).toBe(false)
    expect(
      productCreateSchema.safeParse({
        ...base,
        slug: 'vase',
        colorSlots: [
          { slot: 'zone_1_main', label: 'a' },
          { slot: 'zone_2_accent', label: 'b' },
          { slot: 'zone_3_detail', label: 'c' },
          { slot: 'zone_4_text', label: 'd' },
          { slot: 'zone_1_main', label: 'e' },
        ],
      }).success,
    ).toBe(false)
  })
})

describe('colorCreateSchema', () => {
  it('validates hex colors', () => {
    const base = { name: 'Brand Green', material: 'PLA', manufacturer: 'Bambu Lab' }
    expect(colorCreateSchema.safeParse({ ...base, hex: '#31a871' }).success).toBe(true)
    expect(colorCreateSchema.safeParse({ ...base, hex: '31a871' }).success).toBe(false)
    expect(colorCreateSchema.safeParse({ ...base, hex: '#31a87' }).success).toBe(false)
  })
})

describe('consentLogSchema', () => {
  it('requires necessary=true', () => {
    expect(
      consentLogSchema.safeParse({
        categories: { necessary: true, statistics: false, marketing: false },
        version: '1.0',
      }).success,
    ).toBe(true)
    expect(
      consentLogSchema.safeParse({
        categories: { necessary: false, statistics: false, marketing: false },
        version: '1.0',
      }).success,
    ).toBe(false)
  })
})

describe('loginSchema', () => {
  it('requires a minimum password length', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'long-enough-pw' }).success).toBe(
      true,
    )
  })
})
