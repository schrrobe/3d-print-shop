<script setup lang="ts">
import { PsAdminTable, PsBadge, PsButton, PsDialog, PsInput, PsSelect } from '@print-shop/ui'
import { USER_ROLES } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminUserRow {
  id: string
  email: string
  name: string
  active: boolean
  role: { name: string }
}

const auth = useAdminAuthStore()
const { data, refresh } = await useFetch<{ users: AdminUserRow[] }>('/api/admin/users', {
  credentials: 'include',
  server: false,
})

const dialogOpen = ref(false)
const form = reactive({ name: '', email: '', password: '', role: 'support' })
const { run, pending } = useAdminAction({ refresh })

async function createUser() {
  const ok = await run(
    () =>
      $fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        body: { ...form },
      }),
    { success: 'Benutzer angelegt', error: 'Anlegen fehlgeschlagen (Passwort min. 12 Zeichen?)' },
  )
  if (ok) {
    dialogOpen.value = false
    Object.assign(form, { name: '', email: '', password: '', role: 'support' })
  }
}

function toggleActive(user: AdminUserRow) {
  return run(() =>
    $fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { active: !user.active },
    }),
  )
}

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'E-Mail' },
  { key: 'role', label: 'Rolle' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' },
]
</script>

<template>
  <div data-testid="admin-users">
    <div v-if="auth.can('users:write')" class="mb-lg">
      <PsButton data-testid="new-user" @click="dialogOpen = true">Benutzer anlegen</PsButton>
    </div>

    <PsAdminTable :columns="columns" :rows="data?.users ?? []" empty="Keine Benutzer">
      <template #cell-role="{ row }">
        <PsBadge variant="info">{{ (row as unknown as AdminUserRow).role.name }}</PsBadge>
      </template>
      <template #cell-active="{ value }">
        <PsBadge :variant="value ? 'brand' : 'danger'">{{
          value ? 'aktiv' : 'deaktiviert'
        }}</PsBadge>
      </template>
      <template #cell-actions="{ row }">
        <PsButton
          v-if="auth.can('users:write') && (row as unknown as AdminUserRow).id !== auth.user?.id"
          variant="ghost"
          size="sm"
          data-testid="toggle-user"
          @click="toggleActive(row as unknown as AdminUserRow)"
        >
          {{ (row as unknown as AdminUserRow).active ? 'Deaktivieren' : 'Aktivieren' }}
        </PsButton>
      </template>
    </PsAdminTable>

    <PsDialog v-model:open="dialogOpen" title="Benutzer anlegen">
      <form class="flex flex-col gap-md" data-testid="user-form" @submit.prevent="createUser">
        <PsInput v-model="form.name" label="Name" required />
        <PsInput v-model="form.email" label="E-Mail" type="email" required />
        <PsInput
          v-model="form.password"
          label="Passwort (min. 12 Zeichen)"
          type="password"
          required
        />
        <PsSelect
          v-model="form.role"
          label="Rolle"
          :options="USER_ROLES.map((r) => ({ value: r, label: r }))"
        />
        <PsButton type="submit" :disabled="pending" data-testid="save-user">Anlegen</PsButton>
      </form>
    </PsDialog>
  </div>
</template>
