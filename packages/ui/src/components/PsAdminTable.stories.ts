import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAdminTable from './PsAdminTable.vue'
import PsOrderStatusBadge from './PsOrderStatusBadge.vue'
import PsPrice from './PsPrice.vue'

const columns = [
  { key: 'orderNumber', label: 'Bestellung' },
  { key: 'customer', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'totalCents', label: 'Summe', align: 'right' as const },
]

const rows = [
  { id: '1', orderNumber: 'PS-2026-0142', customer: 'Anna Berger', status: 'in_production', totalCents: 5560 },
  { id: '2', orderNumber: 'PS-2026-0141', customer: 'Jonas Keller', status: 'shipped', totalCents: 1890 },
  { id: '3', orderNumber: 'PS-2026-0140', customer: 'Miriam Voss', status: 'awaiting_payment', totalCents: 12900 },
]

// Generic component (generic="T extends object") — Storybook's Meta typing
// can't infer generic SFCs, so the component is registered untyped.
const meta: Meta = {
  title: 'Admin/AdminTable',
  component: PsAdminTable as never,
  args: { columns, rows },
  render: (args) => ({
    components: { PsAdminTable, PsOrderStatusBadge, PsPrice },
    setup: () => ({ args }),
    template: `
      <PsAdminTable v-bind="args">
        <template #cell-status="{ value }">
          <PsOrderStatusBadge :status="value" />
        </template>
        <template #cell-totalCents="{ value }">
          <PsPrice :cents="value" size="sm" />
        </template>
      </PsAdminTable>
    `,
  }),
}
export default meta
type Story = StoryObj

export const Default: Story = {}
export const PlainCells: Story = {
  render: (args) => ({
    components: { PsAdminTable },
    setup: () => ({ args }),
    template: '<PsAdminTable v-bind="args" />',
  }),
  args: { columns, rows },
}
export const Empty: Story = {
  args: { rows: [], empty: 'Noch keine Bestellungen eingegangen.' },
}
