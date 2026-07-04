import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsConfigurationPreview from './PsConfigurationPreview.vue'

const zones = [
  { slot: 'body', label: 'Korpus', colorName: 'Tiefschwarz', hex: '#171717' },
  { slot: 'lid', label: 'Deckel', colorName: 'Signalgrün', hex: '#31a871' },
  { slot: 'handle', label: 'Griff', colorName: 'Warmweiß', hex: '#f6f3ec' },
  { slot: 'latch', label: 'Verschluss', colorName: 'Orange', hex: '#e8752a' },
]

const meta: Meta<typeof PsConfigurationPreview> = {
  title: 'Shop/ConfigurationPreview',
  component: PsConfigurationPreview,
  args: { zones },
  render: (args) => ({
    components: { PsConfigurationPreview },
    setup: () => ({ args }),
    template: '<PsConfigurationPreview v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsConfigurationPreview>

export const Default: Story = {}

export const Compact: Story = {
  args: { compact: true },
}

export const MitNichtVerfügbar: Story = {
  args: {
    zones: [
      zones[0]!,
      { ...zones[1]!, unavailable: true },
      zones[2]!,
      zones[3]!,
    ],
  },
}
