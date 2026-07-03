import { COMPLAINT_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsButton from './PsButton.vue'
import PsComplaintCard from './PsComplaintCard.vue'

const meta: Meta<typeof PsComplaintCard> = {
  title: 'Admin/ComplaintCard',
  component: PsComplaintCard,
  args: {
    complaintNumber: 'RK-2026-0018',
    orderNumber: 'PS-2026-0142',
    status: 'in_review',
    reason: 'Beschädigt angekommen',
    description: 'Der Übertopf ist an der Unterseite gerissen, vermutlich beim Transport.',
    createdAtLabel: '28.06.2026',
    itemCount: 1,
  },
  argTypes: {
    status: { control: 'select', options: [...COMPLAINT_STATUSES] },
  },
  render: (args) => ({
    components: { PsComplaintCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[36rem]"><PsComplaintCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsComplaintCard>

export const Default: Story = {}

export const AllStatuses: Story = {
  render: () => ({
    components: { PsComplaintCard },
    setup: () => ({ statuses: COMPLAINT_STATUSES }),
    template: `
      <div class="flex max-w-[36rem] flex-col gap-sm">
        <PsComplaintCard
          v-for="(status, index) in statuses"
          :key="status"
          :complaint-number="'RK-2026-00' + (10 + index)"
          order-number="PS-2026-0142"
          :status="status"
          reason="Qualitätsproblem"
          description="Sichtbare Layer-Verschiebung an der Vorderseite des Drucks."
          created-at-label="28.06.2026"
          :item-count="2"
        />
      </div>
    `,
  }),
}

export const LongDescription: Story = {
  args: {
    description:
      'Die Lieferung kam zwar pünktlich an, allerdings war der Karton stark eingedrückt. ' +
      'Beim Auspacken habe ich festgestellt, dass der Schreibtisch-Organizer an zwei Ecken ' +
      'gebrochen ist und die Steckverbindungen der Module nicht mehr halten. Außerdem weicht ' +
      'die Farbe deutlich von der Produktabbildung ab — bestellt war Grün, geliefert wurde ein ' +
      'eher türkiser Ton. Ich bitte um Ersatzlieferung oder Erstattung.',
    itemCount: 3,
  },
}

export const WithActions: Story = {
  args: { status: 'submitted' },
  render: (args) => ({
    components: { PsComplaintCard, PsButton },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[36rem]">
        <PsComplaintCard v-bind="args">
          <template #actions>
            <PsButton size="sm" variant="secondary">Details</PsButton>
            <PsButton size="sm">Prüfung starten</PsButton>
          </template>
        </PsComplaintCard>
      </div>
    `,
  }),
}
