import { PRINTER_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsPrinterStatusCard from './PsPrinterStatusCard.vue'

const meta: Meta<typeof PsPrinterStatusCard> = {
  title: 'Admin/PrinterStatusCard',
  component: PsPrinterStatusCard,
  args: {
    name: 'Drucker 01',
    model: 'Bambu Lab X1 Carbon',
    status: 'printing',
    etaLabel: 'Fertig in ca. 2 Std. 40 Min.',
  },
  argTypes: {
    status: { control: 'select', options: [...PRINTER_STATUSES] },
  },
  render: (args) => ({
    components: { PsPrinterStatusCard },
    setup: () => ({ args }),
    template: '<div class="max-w-sm"><PsPrinterStatusCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsPrinterStatusCard>

export const Printing: Story = {}
export const ErrorWithNotes: Story = {
  args: {
    name: 'Drucker 03',
    model: 'Prusa MK4',
    status: 'error',
    notes: 'Filamentsensor meldet Leerlauf — AMS Slot 2 prüfen.',
    etaLabel: undefined,
  },
}
export const Fleet: Story = {
  render: () => ({
    components: { PsPrinterStatusCard },
    template: `
      <div class="grid max-w-3xl grid-cols-1 gap-md sm:grid-cols-2">
        <PsPrinterStatusCard name="Drucker 01" model="Bambu Lab X1 Carbon" status="printing" eta-label="Fertig in 2 Std." />
        <PsPrinterStatusCard name="Drucker 02" model="Bambu Lab P1S" status="idle" />
        <PsPrinterStatusCard name="Drucker 03" model="Prusa MK4" status="maintenance" notes="Düsenwechsel geplant." />
        <PsPrinterStatusCard name="Drucker 04" model="Bambu Lab A1" status="paused" notes="Filamentwechsel nötig." />
      </div>
    `,
  }),
}
