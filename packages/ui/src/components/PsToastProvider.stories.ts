import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useToast } from '../composables/useToast.js'
import PsButton from './PsButton.vue'
import PsToastProvider from './PsToastProvider.vue'

const meta: Meta<typeof PsToastProvider> = {
  title: 'UI/Toast',
  component: PsToastProvider,
  render: () => ({
    components: { PsToastProvider, PsButton },
    setup: () => {
      const { show } = useToast()
      return { show }
    },
    template: `
      <PsToastProvider>
        <div class="flex flex-wrap gap-md">
          <PsButton variant="secondary" @click="show('Artikel wurde in den Warenkorb gelegt.')">
            Standard-Toast
          </PsButton>
          <PsButton @click="show('Bestellung erfolgreich aufgegeben!', { variant: 'success' })">
            Erfolg
          </PsButton>
          <PsButton variant="danger" @click="show('Upload fehlgeschlagen. Bitte erneut versuchen.', { variant: 'error', durationMs: 6000 })">
            Fehler
          </PsButton>
        </div>
      </PsToastProvider>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsToastProvider>

export const Default: Story = {}
