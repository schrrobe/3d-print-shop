import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsPillButton from './PsPillButton.vue'
import PsSavedConfigurationCard from './PsSavedConfigurationCard.vue'

const zones = [
  { slot: 'body', label: 'Korpus', colorName: 'Tiefschwarz', hex: '#171717' },
  { slot: 'lid', label: 'Deckel', colorName: 'Signalgrün', hex: '#31a871' },
  { slot: 'handle', label: 'Griff', colorName: 'Warmweiß', hex: '#f6f3ec' },
  { slot: 'latch', label: 'Verschluss', colorName: 'Ozeanblau', hex: '#2a6de8' },
]

const meta: Meta<typeof PsSavedConfigurationCard> = {
  title: 'Shop/SavedConfigurationCard',
  component: PsSavedConfigurationCard,
  args: {
    productName: 'Munitionskiste M2A1',
    zones,
    dateLabel: 'Gespeichert am 28. Juni 2026',
    shareUrl: 'https://shop.example.com/c/9f3k2x',
  },
  render: (args) => ({
    components: { PsSavedConfigurationCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[32rem]"><PsSavedConfigurationCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsSavedConfigurationCard>

export const Default: Story = {}

export const MitActions: Story = {
  render: (args) => ({
    components: { PsSavedConfigurationCard, PsPillButton },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[32rem]">
        <PsSavedConfigurationCard v-bind="args">
          <template #actions>
            <PsPillButton size="sm">In den Warenkorb</PsPillButton>
            <PsPillButton size="sm" variant="secondary">Laden</PsPillButton>
          </template>
        </PsSavedConfigurationCard>
      </div>
    `,
  }),
}

export const MitNichtVerfügbarerFarbe: Story = {
  args: {
    zones: [
      zones[0]!,
      { ...zones[1]!, unavailable: true },
      zones[2]!,
      zones[3]!,
    ],
  },
}
