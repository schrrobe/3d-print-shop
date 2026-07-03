import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsScheduledDateTimePicker from './PsScheduledDateTimePicker.vue'

const meta: Meta<typeof PsScheduledDateTimePicker> = {
  title: 'Social/ScheduledDateTimePicker',
  component: PsScheduledDateTimePicker,
  args: { label: 'Veröffentlichung (Datum & Uhrzeit)' },
  render: (args) => ({
    components: { PsScheduledDateTimePicker },
    setup: () => {
      const value = ref<string | null>('2026-07-15T10:00:00.000Z')
      return { args, value }
    },
    template: `
      <div class="max-w-96 flex flex-col gap-md">
        <PsScheduledDateTimePicker v-bind="args" v-model="value" />
        <p class="text-caption text-secondary">Model (UTC): {{ value ?? 'null' }}</p>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsScheduledDateTimePicker>

export const MitWert: Story = {}
export const Pflichtfeld: Story = { args: { required: true } }
export const Fehlerzustand: Story = { args: { error: 'Zum Planen wird ein Zeitpunkt benötigt.' } }
export const Deaktiviert: Story = { args: { disabled: true } }
export const Light: Story = { globals: { theme: 'light' } }
