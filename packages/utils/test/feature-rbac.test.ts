import { USER_ROLES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import { hasPermission } from '../src/rbac.js'

describe('RBAC for complaints / QC / filament / shipments / reviews', () => {
  it('complaints: support handles communication, only admin decides', () => {
    expect(hasPermission('support', 'complaints:read')).toBe(true)
    expect(hasPermission('support', 'complaints:write')).toBe(true)
    expect(hasPermission('production', 'complaints:read')).toBe(true)
    expect(hasPermission('production', 'complaints:write')).toBe(false)
    for (const role of USER_ROLES) {
      expect(hasPermission(role, 'complaints:decide')).toBe(role === 'admin')
    }
  })

  it('QC: production performs checks, shipping reads, only admin overrides', () => {
    expect(hasPermission('production', 'qc:read')).toBe(true)
    expect(hasPermission('production', 'qc:write')).toBe(true)
    expect(hasPermission('shipping', 'qc:read')).toBe(true)
    expect(hasPermission('shipping', 'qc:write')).toBe(false)
    for (const role of USER_ROLES) {
      expect(hasPermission(role, 'qc:override')).toBe(role === 'admin')
    }
  })

  it('filament: production manages stock, product_manager reads', () => {
    expect(hasPermission('production', 'filament:read')).toBe(true)
    expect(hasPermission('production', 'filament:write')).toBe(true)
    expect(hasPermission('product_manager', 'filament:read')).toBe(true)
    expect(hasPermission('product_manager', 'filament:write')).toBe(false)
    expect(hasPermission('support', 'filament:read')).toBe(false)
  })

  it('shipments: shipping owns the flow, production/support read', () => {
    expect(hasPermission('shipping', 'shipments:read')).toBe(true)
    expect(hasPermission('shipping', 'shipments:write')).toBe(true)
    expect(hasPermission('production', 'shipments:read')).toBe(true)
    expect(hasPermission('production', 'shipments:write')).toBe(false)
    expect(hasPermission('support', 'shipments:read')).toBe(true)
    expect(hasPermission('support', 'shipments:write')).toBe(false)
  })

  it('reviews: product_manager and support moderate, production has no access', () => {
    for (const role of ['product_manager', 'support'] as const) {
      expect(hasPermission(role, 'reviews:read')).toBe(true)
      expect(hasPermission(role, 'reviews:moderate')).toBe(true)
    }
    expect(hasPermission('production', 'reviews:read')).toBe(false)
    expect(hasPermission('shipping', 'reviews:moderate')).toBe(false)
  })
})
