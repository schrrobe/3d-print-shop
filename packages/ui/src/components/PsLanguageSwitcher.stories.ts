import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsLanguageSwitcher from './PsLanguageSwitcher.vue'

const meta: Meta<typeof PsLanguageSwitcher> = {
  title: 'Shop/LanguageSwitcher',
  component: PsLanguageSwitcher,
  render: (args) => ({
    components: { PsLanguageSwitcher },
    setup: () => {
      const locale = ref('de')
      return { args, locale }
    },
    template: `
      <div class="flex items-center gap-md">
        <PsLanguageSwitcher v-bind="args" v-model="locale" />
        <span class="text-caption text-secondary">Aktive Sprache: {{ locale }}</span>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsLanguageSwitcher>

export const Default: Story = {}
export const LimitedLocales: Story = {
  args: { locales: ['de', 'en'] },
}
