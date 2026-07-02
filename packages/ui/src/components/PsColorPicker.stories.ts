import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsColorPicker from './PsColorPicker.vue'

const zones = [
  { slot: 'zone_1_main', label: 'Hauptfarbe' },
  { slot: 'zone_2_accent', label: 'Akzentfarbe' },
  { slot: 'zone_3_detail', label: 'Detailfarbe' },
]

const colors = [
  { id: 'green', name: 'Signalgrün', hex: '#31a871' },
  { id: 'black', name: 'Tiefschwarz', hex: '#171717' },
  { id: 'warm', name: 'Warmweiß', hex: '#f6f3ec' },
  { id: 'orange', name: 'Orange', hex: '#e8752a' },
  { id: 'blue', name: 'Ozeanblau', hex: '#2a6de8' },
]

const meta: Meta<typeof PsColorPicker> = {
  title: 'Shop/ColorPicker',
  component: PsColorPicker,
  args: { zones, colors },
  render: (args) => ({
    components: { PsColorPicker },
    setup: () => {
      const selection = ref<Record<string, string>>({ zone_1_main: 'green' })
      return { args, selection }
    },
    template: `
      <div class="flex max-w-[28rem] flex-col gap-lg">
        <PsColorPicker v-bind="args" v-model="selection" />
        <pre class="rounded-card bg-surface-elevated p-md text-caption text-secondary">{{ selection }}</pre>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsColorPicker>

export const Default: Story = {}
export const SingleZone: Story = {
  args: { zones: [{ slot: 'zone_1_main', label: 'Farbe' }] },
}
