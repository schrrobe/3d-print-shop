<script setup lang="ts">
// Admin is client-side gated only — keep the shell out of search indexes
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
import { PsAdminHeader, PsAdminSidebar, PsButton, PsToastProvider } from '@print-shop/ui'

/** Admin shell — subtle styling only, no big animations (design rule). */
const auth = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  product_manager: 'Produktmanagement',
  production: 'Produktion',
  shipping: 'Versand',
  support: 'Support',
}

const navItems = computed(() => {
  const items = [
    { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: '📊', permission: 'dashboard:read' as const },
    { key: 'orders', label: 'Bestellungen', href: '/admin/orders', icon: '🧾', permission: 'orders:read' as const },
    { key: 'shipments', label: 'Versand', href: '/admin/shipments', icon: '📦', permission: 'shipments:read' as const },
    { key: 'complaints', label: 'Reklamationen', href: '/admin/complaints', icon: '↩️', permission: 'complaints:read' as const },
    { key: 'uploads', label: 'Upload-Anfragen', href: '/admin/uploads', icon: '📥', permission: 'uploads:read' as const },
    { key: 'tickets', label: 'Support-Tickets', href: '/admin/tickets', icon: '🎫', permission: 'tickets:read' as const },
    { key: 'reviews', label: 'Bewertungen', href: '/admin/reviews', icon: '⭐', permission: 'reviews:read' as const },
    { key: 'products', label: 'Produkte', href: '/admin/products', icon: '📦', permission: 'products:read' as const },
    { key: 'social', label: 'Social Media Planner', href: '/admin/social', icon: '📣', permission: 'social-posts:read' as const },
    { key: 'colors', label: 'Farben', href: '/admin/colors', icon: '🎨', permission: 'colors:read' as const },
    { key: 'printers', label: 'Drucker', href: '/admin/printers', icon: '🖨️', permission: 'printers:read' as const },
    { key: 'filament', label: 'Filament & AMS', href: '/admin/filament', icon: '🧵', permission: 'filament:read' as const },
    { key: 'production', label: 'Produktionsqueue', href: '/admin/production', icon: '⚙️', permission: 'print-jobs:read' as const },
    { key: 'calendar', label: 'Produktionskalender', href: '/admin/production/calendar', icon: '📅', permission: 'print-jobs:read' as const },
    { key: 'qc', label: 'Qualitätsprüfung', href: '/admin/qc', icon: '✅', permission: 'qc:read' as const },
    { key: 'payments', label: 'Zahlungen', href: '/admin/payments', icon: '💶', permission: 'payments:read' as const },
    { key: 'invoices', label: 'Rechnungen', href: '/admin/invoices', icon: '📄', permission: 'invoices:read' as const },
    { key: 'users', label: 'Benutzer', href: '/admin/users', icon: '👥', permission: 'users:read' as const },
    { key: 'audit', label: 'Audit-Log', href: '/admin/audit', icon: '🔍', permission: 'audit:read' as const },
    { key: 'settings', label: 'Einstellungen', href: '/admin/settings', icon: '⚙️', permission: 'settings:read' as const },
  ]
  return items
    .filter((item) => auth.can(item.permission))
    .map((item) => ({
      ...item,
      active:
        item.href === '/admin'
          ? route.path === '/admin'
          : item.href === '/admin/production'
            ? route.path === '/admin/production'
            : route.path.startsWith(item.href),
    }))
})

const pageTitle = computed(() => {
  const active = navItems.value.find((i) => i.active)
  return active?.label ?? 'Admin'
})

async function logout() {
  await auth.logout()
  await router.push('/admin/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-surface text-primary">
    <PsAdminSidebar :items="navItems" title="Print Shop Admin" class="w-64 shrink-0 border-r border-subtle">
      <template #footer>
        <PsButton variant="ghost" size="sm" data-testid="admin-logout" @click="logout">Abmelden</PsButton>
      </template>
    </PsAdminSidebar>
    <div class="flex min-w-0 flex-1 flex-col">
      <PsAdminHeader
        :title="pageTitle"
        :user-name="auth.user?.name"
        :role-label="auth.user ? roleLabels[auth.user.role] : undefined"
        class="border-b border-subtle px-lg py-md"
      />
      <main class="flex-1 p-lg">
        <slot />
      </main>
    </div>
    <PsToastProvider />
  </div>
</template>
