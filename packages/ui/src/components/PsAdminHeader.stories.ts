import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAdminHeader from './PsAdminHeader.vue'
import PsButton from './PsButton.vue'

const meta: Meta<typeof PsAdminHeader> = {
  title: 'Admin/AdminHeader',
  component: PsAdminHeader,
  args: {
    title: 'Bestellungen',
    userName: 'Rebecca Schmidt',
    roleLabel: 'Produktion',
  },
  render: (args) => ({
    components: { PsAdminHeader },
    setup: () => ({ args }),
    template: '<PsAdminHeader v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsAdminHeader>

export const Default: Story = {}
export const WithActions: Story = {
  render: (args) => ({
    components: { PsAdminHeader, PsButton },
    setup: () => ({ args }),
    template: `
      <PsAdminHeader v-bind="args">
        <template #actions>
          <PsButton variant="secondary" size="sm">Exportieren</PsButton>
          <PsButton size="sm">Neue Bestellung</PsButton>
        </template>
      </PsAdminHeader>
    `,
  }),
}
export const TitleOnly: Story = {
  args: { userName: undefined, roleLabel: undefined },
}
