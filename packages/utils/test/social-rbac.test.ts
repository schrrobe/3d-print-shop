import { describe, expect, it } from 'vitest'
import { hasPermission } from '../src/rbac.js'

describe('social post RBAC', () => {
  it('admin may read and write social posts', () => {
    expect(hasPermission('admin', 'social-posts:read')).toBe(true)
    expect(hasPermission('admin', 'social-posts:write')).toBe(true)
  })

  it('product_manager may read and write social posts', () => {
    expect(hasPermission('product_manager', 'social-posts:read')).toBe(true)
    expect(hasPermission('product_manager', 'social-posts:write')).toBe(true)
  })

  it('support may only read', () => {
    expect(hasPermission('support', 'social-posts:read')).toBe(true)
    expect(hasPermission('support', 'social-posts:write')).toBe(false)
  })

  it('production and shipping have no social access', () => {
    expect(hasPermission('production', 'social-posts:read')).toBe(false)
    expect(hasPermission('production', 'social-posts:write')).toBe(false)
    expect(hasPermission('shipping', 'social-posts:read')).toBe(false)
    expect(hasPermission('shipping', 'social-posts:write')).toBe(false)
  })
})
