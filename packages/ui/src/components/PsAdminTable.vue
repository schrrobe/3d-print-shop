<script setup lang="ts" generic="T extends object">
import { computed, ref } from 'vue'
import { sortRows, type SortDirection } from './adminTableSort'

interface Column {
  key: string
  label: string
  align?: 'left' | 'right'
  /** Defaults to true for columns with a label (action columns stay unsortable). */
  sortable?: boolean
  /** Value to sort by when the cell holds an object or a computed display. */
  sortValue?: (row: T) => unknown
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    rows: T[]
    rowKey?: string
    empty?: string
  }>(),
  { rowKey: 'id', empty: 'Keine Einträge vorhanden.' },
)

function cell(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function isSortable(column: Column): boolean {
  return column.sortable ?? column.label !== ''
}

const sort = ref<{ key: string; direction: SortDirection } | null>(null)

/** asc → desc → original order */
function toggleSort(key: string) {
  const current = sort.value?.key === key ? sort.value.direction : null
  sort.value =
    current === null
      ? { key, direction: 'asc' }
      : current === 'asc'
        ? { key, direction: 'desc' }
        : null
}

const sortedRows = computed(() => {
  const active = sort.value
  const column = active && props.columns.find((c) => c.key === active.key)
  if (!active || !column) return props.rows
  return sortRows(
    props.rows,
    column.sortValue ?? ((row) => cell(row, column.key)),
    active.direction,
  )
})

function ariaSort(key: string) {
  if (sort.value?.key !== key) return 'none'
  return sort.value.direction === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <!-- Wide tables scroll inside their own box instead of widening the page on phones. -->
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-body-regular" data-testid="admin-table">
      <thead>
        <tr class="border-b border-subtle">
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-md py-sm text-caption uppercase text-secondary"
            :class="column.align === 'right' ? 'text-right' : 'text-left'"
            :aria-sort="isSortable(column) ? ariaSort(column.key) : undefined"
          >
            <button
              v-if="isSortable(column)"
              type="button"
              class="inline-flex items-center gap-xs uppercase hover:text-primary"
              :data-testid="`sort-${column.key}`"
              @click="toggleSort(column.key)"
            >
              {{ column.label }}
              <span
                aria-hidden="true"
                :class="sort?.key === column.key ? 'text-primary' : 'opacity-40'"
              >
                {{ sort?.key === column.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </button>
            <template v-else>{{ column.label }}</template>
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
          v-for="row in sortedRows"
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
  </div>
</template>
