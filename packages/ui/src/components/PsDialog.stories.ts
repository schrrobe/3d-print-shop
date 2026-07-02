import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsButton from './PsButton.vue'
import PsDialog from './PsDialog.vue'
import PsPillButton from './PsPillButton.vue'

const meta: Meta<typeof PsDialog> = {
  title: 'UI/Dialog',
  component: PsDialog,
  args: {
    title: 'Artikel entfernen?',
    description: 'Der Artikel wird aus deinem Warenkorb entfernt.',
  },
  render: (args) => ({
    components: { PsDialog, PsButton, PsPillButton },
    setup: () => ({ args }),
    template: `
      <PsDialog v-bind="args">
        <template #trigger>
          <PsPillButton variant="secondary">Dialog öffnen</PsPillButton>
        </template>
        <div class="flex justify-end gap-sm">
          <PsButton variant="ghost">Abbrechen</PsButton>
          <PsButton variant="danger">Entfernen</PsButton>
        </div>
      </PsDialog>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsDialog>

export const Default: Story = {}
export const WithoutDescription: Story = {
  args: { title: 'Hinweis', description: undefined },
}
