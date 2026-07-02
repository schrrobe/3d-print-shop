import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsNavPill from './PsNavPill.vue'

const meta: Meta<typeof PsNavPill> = {
  title: 'UI/NavPill',
  component: PsNavPill,
  args: { active: false },
  render: (args) => ({
    components: { PsNavPill },
    setup: () => ({ args }),
    template: '<PsNavPill v-bind="args">Produkte</PsNavPill>',
  }),
}
export default meta
type Story = StoryObj<typeof PsNavPill>

export const Default: Story = {}
export const Active: Story = { args: { active: true } }

export const NavBar: Story = {
  render: () => ({
    components: { PsNavPill },
    template: `
      <nav class="flex items-center gap-sm">
        <PsNavPill as="a" href="#" active>Shop</PsNavPill>
        <PsNavPill as="a" href="#">Konfigurator</PsNavPill>
        <PsNavPill as="a" href="#">Über uns</PsNavPill>
        <PsNavPill as="a" href="#">Kontakt</PsNavPill>
      </nav>
    `,
  }),
}
