import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsButton from './PsButton.vue'
import PsFilamentSpoolCard from './PsFilamentSpoolCard.vue'

const meta: Meta<typeof PsFilamentSpoolCard> = {
  title: 'Admin/FilamentSpoolCard',
  component: PsFilamentSpoolCard,
  args: {
    label: 'Spule #12',
    material: 'PLA Matt',
    manufacturer: 'Bambu Lab',
    colorName: 'Schwarz',
    colorHex: '#1a1a1a',
    remainingGrams: 540,
    totalGrams: 1000,
    minRemainingGrams: 200,
    storageLocation: 'Regal A · Fach 3',
    active: true,
    reorder: false,
  },
  render: (args) => ({
    components: { PsFilamentSpoolCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[28rem]"><PsFilamentSpoolCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsFilamentSpoolCard>

export const Default: Story = {}
export const UnterMinimum: Story = {
  args: {
    label: 'Spule #07',
    colorName: 'Signalrot',
    colorHex: '#d32f2f',
    remainingGrams: 120,
    minRemainingGrams: 200,
  },
}
export const Nachbestellen: Story = {
  args: {
    label: 'Spule #03',
    material: 'PETG',
    colorName: 'Transparent',
    colorHex: '#e0e0e0',
    remainingGrams: 230,
    reorder: true,
  },
}
export const Inaktiv: Story = {
  args: {
    label: 'Spule #21',
    material: 'ABS',
    colorName: 'Grau',
    colorHex: '#9e9e9e',
    active: false,
  },
}
export const ImAms: Story = {
  args: {
    label: 'Spule #05',
    colorName: 'Brandgrün',
    colorHex: '#31a871',
    storageLocation: null,
    amsLocationLabel: 'AMS 2 Pro #1 · Slot 2',
  },
}
export const MitActions: Story = {
  render: (args) => ({
    components: { PsFilamentSpoolCard, PsButton },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[28rem]">
        <PsFilamentSpoolCard v-bind="args">
          <template #actions>
            <PsButton size="sm" variant="secondary">Bearbeiten</PsButton>
            <PsButton size="sm" variant="ghost">In AMS laden</PsButton>
          </template>
        </PsFilamentSpoolCard>
      </div>
    `,
  }),
}
