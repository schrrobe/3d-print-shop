import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsCard from './PsCard.vue'

const meta: Meta<typeof PsCard> = {
  title: 'UI/Card',
  component: PsCard,
  args: { hover: false },
  render: (args) => ({
    components: { PsCard },
    setup: () => ({ args }),
    template: `
      <PsCard v-bind="args" class="max-w-[24rem]">
        <h3 class="text-subheading text-primary">Vasenmodus-Übertopf</h3>
        <p class="mt-sm text-body-regular text-secondary">
          Gedruckt aus recyceltem PETG, wasserdicht und spülmaschinenfest.
        </p>
      </PsCard>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsCard>

export const Default: Story = {}
export const Hover: Story = { args: { hover: true } }
export const Unpadded: Story = {
  render: () => ({
    components: { PsCard },
    template: `
      <PsCard :padded="false" class="max-w-[24rem]">
        <div class="aspect-[4/3] rounded-t-card bg-surface"></div>
        <div class="p-md text-body-regular text-primary">Eigenes Padding im Slot</div>
      </PsCard>
    `,
  }),
}
