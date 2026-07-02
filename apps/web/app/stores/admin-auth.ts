import type { UserRole } from '@print-shop/types'
import type { Permission } from '@print-shop/utils'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: Permission[]
}

/** Admin session (httpOnly cookie holds the JWT; this store mirrors /me). */
export const useAdminAuthStore = defineStore('admin-auth', () => {
  const user = ref<AdminUser | null>(null)
  const checked = ref(false)

  async function fetchMe(): Promise<AdminUser | null> {
    try {
      const data = await $fetch<{ user: AdminUser }>('/api/admin/auth/me', {
        credentials: 'include',
      })
      user.value = data.user
    } catch {
      user.value = null
    }
    checked.value = true
    return user.value
  }

  async function login(email: string, password: string): Promise<AdminUser> {
    const data = await $fetch<{ user: AdminUser }>('/api/admin/auth/login', {
      method: 'POST',
      body: { email, password },
      credentials: 'include',
    })
    user.value = data.user
    checked.value = true
    return data.user
  }

  async function logout() {
    await $fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
    user.value = null
  }

  const can = computed(() => (permission: Permission) => {
    return user.value?.permissions.includes(permission) ?? false
  })

  return { user, checked, fetchMe, login, logout, can }
})
