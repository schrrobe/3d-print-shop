import type { UserRole } from '@print-shop/types'

export const PERMISSIONS = [
  'dashboard:read',
  'products:read',
  'products:write',
  'colors:read',
  'colors:write',
  'assets:write',
  'content:write',
  'uploads:read',
  'uploads:review',
  'quotes:read',
  'quotes:write',
  'orders:read',
  'orders:write',
  'orders:ship',
  'payments:read',
  'payments:write',
  'invoices:read',
  'printers:read',
  'printers:write',
  'print-jobs:read',
  'print-jobs:write',
  'users:read',
  'users:write',
  'audit:read',
] as const
export type Permission = (typeof PERMISSIONS)[number]

/**
 * Role → permission matrix.
 * admin: everything. product_manager: products, colors, assets, content.
 * production: review uploads, manage printers & print jobs.
 * shipping: shipping status, tracking numbers, orders for shipping.
 * support: read-only orders, customer requests, statuses.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: PERMISSIONS,
  product_manager: [
    'dashboard:read',
    'products:read',
    'products:write',
    'colors:read',
    'colors:write',
    'assets:write',
    'content:write',
  ],
  production: [
    'dashboard:read',
    'uploads:read',
    'uploads:review',
    'printers:read',
    'printers:write',
    'print-jobs:read',
    'print-jobs:write',
    'orders:read',
  ],
  shipping: ['dashboard:read', 'orders:read', 'orders:ship'],
  support: [
    'dashboard:read',
    'orders:read',
    'uploads:read',
    'quotes:read',
    'payments:read',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function permissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
