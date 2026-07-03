import { QC_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsButton from './PsButton.vue'
import PsQualityCheckCard from './PsQualityCheckCard.vue'

const meta: Meta<typeof PsQualityCheckCard> = {
  title: 'Admin/QualityCheckCard',
  component: PsQualityCheckCard,
  args: {
    orderNumber: 'PS-2026-0042',
    itemName: 'Vase Twisted — PLA Matt Schwarz',
    printerName: 'Drucker 01 · Bambu Lab X1 Carbon',
    status: 'open',
    checkedCount: 0,
  },
  argTypes: {
    status: { control: 'select', options: [...QC_STATUSES] },
  },
  render: (args) => ({
    components: { PsQualityCheckCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[28rem]"><PsQualityCheckCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsQualityCheckCard>

export const Offen: Story = {}
export const Bestanden: Story = {
  args: { status: 'passed', checkedCount: 6 },
}
export const Fehlgeschlagen: Story = {
  args: {
    status: 'failed',
    checkedCount: 4,
    noteText: 'Oberfläche zeigt Layer-Shifting an der Außenseite.',
  },
}
export const NeudruckNoetig: Story = {
  args: {
    status: 'reprint_required',
    checkedCount: 3,
    noteText: 'Maßabweichung > 0,5 mm — Neudruck eingeplant.',
  },
}
export const Ueberschrieben: Story = {
  args: {
    status: 'overridden',
    checkedCount: 5,
    overrideReason: 'Kunde hat kleinere Farbabweichung telefonisch akzeptiert.',
  },
}
export const MitOverrideGrund: Story = {
  args: {
    status: 'overridden',
    checkedCount: 4,
    noteText: 'Verpackung leicht beschädigt, Inhalt einwandfrei.',
    overrideReason: 'Freigabe durch Schichtleitung — Express-Bestellung.',
  },
}
export const MitActions: Story = {
  render: (args) => ({
    components: { PsQualityCheckCard, PsButton },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[28rem]">
        <PsQualityCheckCard v-bind="args">
          <template #actions>
            <PsButton size="sm">Prüfung starten</PsButton>
            <PsButton size="sm" variant="secondary">Details</PsButton>
          </template>
        </PsQualityCheckCard>
      </div>
    `,
  }),
}
