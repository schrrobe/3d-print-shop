import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, screen, userEvent, within } from 'storybook/test'
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

export const OpensViaTrigger: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Dialog öffnen' }))
    // Radix renders the dialog into a portal outside the canvas element.
    const dialog = await screen.findByRole('dialog')
    await expect(dialog).toHaveTextContent('Artikel entfernen?')
    await userEvent.keyboard('{Escape}')
    await expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  },
}
