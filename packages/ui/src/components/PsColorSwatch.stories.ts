import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsColorSwatch from './PsColorSwatch.vue'

const meta: Meta<typeof PsColorSwatch> = {
  title: 'UI/ColorSwatch',
  component: PsColorSwatch,
  args: { hex: '#31a871', name: 'Signalgrün', selected: false },
  render: (args) => ({
    components: { PsColorSwatch },
    setup: () => ({ args }),
    template: '<PsColorSwatch v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsColorSwatch>

export const Default: Story = {}
export const Selected: Story = { args: { selected: true } }

export const SwatchRow: Story = {
  render: () => ({
    components: { PsColorSwatch },
    setup: () => {
      const colors = [
        { id: 'green', name: 'Signalgrün', hex: '#31a871' },
        { id: 'black', name: 'Tiefschwarz', hex: '#171717' },
        { id: 'warm', name: 'Warmweiß', hex: '#f6f3ec' },
        { id: 'orange', name: 'Orange', hex: '#e8752a' },
        { id: 'blue', name: 'Ozeanblau', hex: '#2a6de8' },
      ]
      const selected = ref('green')
      return { colors, selected }
    },
    template: `
      <div class="flex items-center gap-sm">
        <PsColorSwatch
          v-for="color in colors"
          :key="color.id"
          :hex="color.hex"
          :name="color.name"
          :selected="selected === color.id"
          @select="selected = color.id"
        />
      </div>
    `,
  }),
}
