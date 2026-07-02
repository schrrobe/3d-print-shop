<script setup lang="ts" generic="T extends object">
withDefaults(
  defineProps<{
    columns: { key: string; label: string; align?: 'left' | 'right' }[]
    rows: T[]
    rowKey?: string
    empty?: string
  }>(),
  { rowKey: 'id', empty: 'Keine Einträge vorhanden.' },
)

function cell(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}
</script>

<template>
  <table class="w-full border-collapse text-body-regular" data-testid="admin-table">
    <thead>
      <tr class="border-b border-subtle">
        <th
          v-for="column in columns"
          :key="column.key"
          scope="col"
          class="px-md py-sm text-caption uppercase text-secondary"
          :class="column.align === 'right' ? 'text-right' : 'text-left'"
        >
          {{ column.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="rows.length === 0">
        <td :colspan="columns.length" class="px-md py-lg text-center text-secondary">
          {{ empty }}
        </td>
      </tr>
      <tr
        v-for="row in rows"
        :key="String(cell(row, rowKey))"
        class="border-b border-subtle transition-colors hover:bg-surface"
      >
        <td
          v-for="column in columns"
          :key="column.key"
          class="px-md py-sm text-primary"
          :class="column.align === 'right' ? 'text-right' : 'text-left'"
        >
          <slot :name="`cell-${column.key}`" :row="row" :value="cell(row, column.key)">
            {{ cell(row, column.key) }}
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
