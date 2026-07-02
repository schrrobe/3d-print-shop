/** Guards /admin/* routes: requires a valid session (checked client-side against /me). */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/admin/login' || to.path === '/admin/reset-password') return
  const auth = useAdminAuthStore()
  if (!auth.checked) await auth.fetchMe()
  if (!auth.user) {
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
