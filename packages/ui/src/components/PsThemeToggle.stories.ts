import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsThemeToggle from './PsThemeToggle.vue'

const meta: Meta<typeof PsThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: PsThemeToggle,
  render: () => ({
    components: { PsThemeToggle },
    setup: () => ({ mode: ref<'dark' | 'light' | 'system'>('system') }),
    template: `
      <div class="flex flex-col items-start gap-md">
        <PsThemeToggle v-model="mode" />
        <span class="text-caption text-secondary">Aktiv: {{ mode }}</span>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsThemeToggle>

export const Default: Story = {}
