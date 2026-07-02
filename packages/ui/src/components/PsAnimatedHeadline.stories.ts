import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAnimatedHeadline from './PsAnimatedHeadline.vue'

const meta: Meta<typeof PsAnimatedHeadline> = {
  title: 'UI/AnimatedHeadline',
  component: PsAnimatedHeadline,
  args: {
    text: 'Dein Design. Frisch gedruckt.',
    tag: 'h2',
    stagger: 0.04,
  },
  render: (args) => ({
    components: { PsAnimatedHeadline },
    setup: () => ({ args }),
    template: '<PsAnimatedHeadline v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsAnimatedHeadline>

export const Default: Story = {}
export const SlowStagger: Story = {
  args: { text: 'Wort für Wort nach oben', stagger: 0.15 },
}
export const CustomClassAndTag: Story = {
  render: (args) => ({
    components: { PsAnimatedHeadline },
    setup: () => ({ args }),
    template: '<PsAnimatedHeadline v-bind="args" class="text-heading-large text-brand" />',
  }),
  args: { text: 'Kleinere Überschrift in Markenfarbe', tag: 'h3' },
}
