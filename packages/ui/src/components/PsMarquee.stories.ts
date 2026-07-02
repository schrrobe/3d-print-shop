import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsMarquee from './PsMarquee.vue'

const meta: Meta<typeof PsMarquee> = {
  title: 'Layout/Marquee',
  component: PsMarquee,
  args: { durationSeconds: 30, pauseOnHover: true },
  render: (args) => ({
    components: { PsMarquee },
    setup: () => ({ args }),
    template: `
      <PsMarquee v-bind="args">
        <span v-for="text in ['Frisch gedruckt in Deutschland', '·', 'Ab 49 € versandkostenfrei', '·', 'Recycelte Materialien', '·', '4 Farbzonen frei wählbar', '·']" :key="text" class="whitespace-nowrap text-subheading text-primary">{{ text }}</span>
      </PsMarquee>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsMarquee>

export const Default: Story = {}
export const Fast: Story = { args: { durationSeconds: 8 } }
export const NoPauseOnHover: Story = { args: { pauseOnHover: false } }
