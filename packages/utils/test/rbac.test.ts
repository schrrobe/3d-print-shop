import { USER_ROLES } from '@print-shop/types'
import { describe, expect, it } from 'vitest'
import { hasPermission, PERMISSIONS, permissionsForRole, ROLE_PERMISSIONS } from '../src/rbac.js'

describe('RBAC', () => {
  it('defines permissions for every role', () => {
    for (const role of USER_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined()
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0)
    }
  })

  it('admin can do everything', () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission('admin', permission)).toBe(true)
    }
  })

  it('product manager manages products, colors, assets, content — nothing else', () => {
    expect(hasPermission('product_manager', 'products:write')).toBe(true)
    expect(hasPermission('product_manager', 'colors:write')).toBe(true)
    expect(hasPermission('product_manager', 'assets:write')).toBe(true)
    expect(hasPermission('product_manager', 'content:write')).toBe(true)
    expect(hasPermission('product_manager', 'orders:write')).toBe(false)
    expect(hasPermission('product_manager', 'users:write')).toBe(false)
    expect(hasPermission('product_manager', 'payments:write')).toBe(false)
  })

  it('production reviews uploads and manages printers/jobs', () => {
    expect(hasPermission('production', 'uploads:review')).toBe(true)
    expect(hasPermission('production', 'printers:write')).toBe(true)
    expect(hasPermission('production', 'print-jobs:write')).toBe(true)
    expect(hasPermission('production', 'products:write')).toBe(false)
    expect(hasPermission('production', 'orders:ship')).toBe(false)
  })

  it('shipping handles shipping status and tracking only', () => {
    expect(hasPermission('shipping', 'orders:ship')).toBe(true)
    expect(hasPermission('shipping', 'orders:read')).toBe(true)
    expect(hasPermission('shipping', 'orders:write')).toBe(false)
    expect(hasPermission('shipping', 'printers:write')).toBe(false)
  })

  it('support is read-only except for tickets and complaint handling', () => {
    expect(hasPermission('support', 'orders:read')).toBe(true)
    expect(hasPermission('support', 'quotes:read')).toBe(true)
    expect(hasPermission('support', 'payments:read')).toBe(true)
    for (const permission of PERMISSIONS.filter(
      (p) =>
        (p.endsWith(':write') && p !== 'tickets:write' && p !== 'complaints:write') ||
        p === 'orders:ship',
    )) {
      expect(hasPermission('support', permission)).toBe(false)
    }
  })

  it('support owns tickets; other non-admin roles have no ticket access', () => {
    expect(hasPermission('support', 'tickets:read')).toBe(true)
    expect(hasPermission('support', 'tickets:write')).toBe(true)
    for (const role of ['product_manager', 'production', 'shipping'] as const) {
      expect(hasPermission(role, 'tickets:read')).toBe(false)
      expect(hasPermission(role, 'tickets:write')).toBe(false)
    }
  })

  it('only admin manages vouchers; support may read them', () => {
    expect(hasPermission('admin', 'vouchers:write')).toBe(true)
    expect(hasPermission('support', 'vouchers:read')).toBe(true)
    for (const role of ['product_manager', 'production', 'shipping', 'support'] as const) {
      expect(hasPermission(role, 'vouchers:write')).toBe(false)
    }
  })

  it('conversion tracking dashboard is admin & product_manager only', () => {
    expect(hasPermission('admin', 'tracking:read')).toBe(true)
    expect(hasPermission('product_manager', 'tracking:read')).toBe(true)
    for (const role of ['production', 'shipping', 'support'] as const) {
      expect(hasPermission(role, 'tracking:read')).toBe(false)
    }
  })

  it('permissionsForRole returns the role matrix', () => {
    expect(permissionsForRole('shipping')).toEqual(ROLE_PERMISSIONS.shipping)
  })
})
