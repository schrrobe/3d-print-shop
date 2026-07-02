import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsTabs from './PsTabs.vue'

const meta: Meta<typeof PsTabs> = {
  title: 'UI/Tabs',
  component: PsTabs,
  args: {
    tabs: [
      { value: 'beschreibung', label: 'Beschreibung' },
      { value: 'material', label: 'Material' },
      { value: 'versand', label: 'Versand' },
    ],
  },
  render: (args) => ({
    components: { PsTabs },
    setup: () => ({ args, active: ref('beschreibung') }),
    template: `
      <PsTabs v-bind="args" v-model="active">
        <template #beschreibung>
          <p class="text-body-regular text-secondary">
            Modularer Schreibtisch-Organizer, gedruckt in bis zu vier Farbzonen.
          </p>
        </template>
        <template #material>
          <p class="text-body-regular text-secondary">
            PLA aus nachwachsenden Rohstoffen, 0,2 mm Schichthöhe.
          </p>
        </template>
        <template #versand>
          <p class="text-body-regular text-secondary">
            Versand mit DHL innerhalb von 3–5 Werktagen. Ab 49 € versandkostenfrei.
          </p>
        </template>
      </PsTabs>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsTabs>

export const Default: Story = {}
export const TwoTabs: Story = {
  args: {
    tabs: [
      { value: 'details', label: 'Details' },
      { value: 'bewertungen', label: 'Bewertungen' },
    ],
  },
  render: (args) => ({
    components: { PsTabs },
    setup: () => ({ args, active: ref('details') }),
    template: `
      <PsTabs v-bind="args" v-model="active">
        <template #details><p class="text-body-regular text-secondary">Maße: 120 × 80 × 40 mm.</p></template>
        <template #bewertungen><p class="text-body-regular text-secondary">★★★★★ – „Perfekte Passform!“</p></template>
      </PsTabs>
    `,
  }),
}
