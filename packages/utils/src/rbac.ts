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
  'tickets:read',
  'tickets:write',
  'social-posts:read',
  'social-posts:write',
  'complaints:read',
  'complaints:write',
  'complaints:decide',
  'qc:read',
  'qc:write',
  'qc:override',
  'filament:read',
  'filament:write',
  'shipments:read',
  'shipments:write',
  'reviews:read',
  'reviews:moderate',
  'vouchers:read',
  'vouchers:write',
] as const
export type Permission = (typeof PERMISSIONS)[number]

/**
 * Role → permission matrix.
 * admin: everything. product_manager: products, colors, assets, content.
 * production: review uploads, manage printers & print jobs.
 * shipping: shipping status, tracking numbers, orders for shipping.
 * support: read-only orders, customer requests, statuses; owns support tickets.
 * Social posts: admin & product_manager plan/publish, support reads.
 * Complaints: support handles communication, only admin decides (complaints:decide).
 * QC: production performs checks, only admin overrides (qc:override).
 * Filament/AMS: production manages stock, product_manager reads.
 * Shipments: shipping owns the flow, production/support read.
 * Reviews: product_manager & support moderate.
 * Vouchers: only admin manages (vouchers:write), support reads for order questions.
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
    'social-posts:read',
    'social-posts:write',
    'filament:read',
    'reviews:read',
    'reviews:moderate',
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
    'qc:read',
    'qc:write',
    'filament:read',
    'filament:write',
    'complaints:read',
    'shipments:read',
  ],
  shipping: [
    'dashboard:read',
    'orders:read',
    'orders:ship',
    'shipments:read',
    'shipments:write',
    'qc:read',
  ],
  support: [
    'dashboard:read',
    'orders:read',
    'uploads:read',
    'quotes:read',
    'payments:read',
    'tickets:read',
    'tickets:write',
    'social-posts:read',
    'complaints:read',
    'complaints:write',
    'shipments:read',
    'reviews:read',
    'reviews:moderate',
    'vouchers:read',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function permissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
