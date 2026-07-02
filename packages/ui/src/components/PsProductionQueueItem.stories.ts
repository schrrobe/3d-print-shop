import { PRODUCTION_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsButton from './PsButton.vue'
import PsProductionQueueItem from './PsProductionQueueItem.vue'

const meta: Meta<typeof PsProductionQueueItem> = {
  title: 'Admin/ProductionQueueItem',
  component: PsProductionQueueItem,
  args: {
    orderNumber: 'PS-2026-0142',
    itemName: 'Schreibtisch-Organizer (grün/schwarz)',
    status: 'printing',
    printerName: 'Drucker 01',
    durationLabel: 'noch 1 Std. 20 Min.',
  },
  argTypes: {
    status: { control: 'select', options: [...PRODUCTION_STATUSES] },
  },
  render: (args) => ({
    components: { PsProductionQueueItem },
    setup: () => ({ args }),
    template: '<div class="max-w-xl"><PsProductionQueueItem v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsProductionQueueItem>

export const Default: Story = {}
export const WithActions: Story = {
  args: { status: 'waiting', printerName: null, durationLabel: undefined },
  render: (args) => ({
    components: { PsProductionQueueItem, PsButton },
    setup: () => ({ args }),
    template: `
      <div class="max-w-xl">
        <PsProductionQueueItem v-bind="args">
          <template #actions>
            <PsButton size="sm" variant="secondary">Zuweisen</PsButton>
          </template>
        </PsProductionQueueItem>
      </div>
    `,
  }),
}
export const Queue: Story = {
  render: () => ({
    components: { PsProductionQueueItem },
    template: `
      <div class="flex max-w-xl flex-col gap-sm">
        <PsProductionQueueItem order-number="PS-2026-0142" item-name="Schreibtisch-Organizer" status="printing" printer-name="Drucker 01" duration-label="noch 1 Std." />
        <PsProductionQueueItem order-number="PS-2026-0141" item-name="Vasenmodus-Übertopf" status="quality_check" printer-name="Drucker 02" />
        <PsProductionQueueItem order-number="PS-2026-0139" item-name="Wandhalterung Kopfhörer" status="failed" printer-name="Drucker 03" />
        <PsProductionQueueItem order-number="PS-2026-0138" item-name="Kabel-Organizer 6er-Set" status="waiting" />
      </div>
    `,
  }),
}
