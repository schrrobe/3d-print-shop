import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPostCalendar from './PsSocialPostCalendar.vue'
import { SAMPLE_POSTS } from './social-story-fixtures.js'

const meta: Meta<typeof PsSocialPostCalendar> = {
  title: 'Social/SocialPostCalendar',
  component: PsSocialPostCalendar,
  args: { posts: SAMPLE_POSTS, initialMonth: '2026-07' },
  render: (args) => ({
    components: { PsSocialPostCalendar },
    setup: () => ({ args }),
    template: '<PsSocialPostCalendar v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPostCalendar>

export const MitPosts: Story = {}
export const LeererMonat: Story = { args: { posts: [], initialMonth: '2026-09' } }
export const NurEntwuerfe: Story = { args: { posts: [SAMPLE_POSTS[0]!], initialMonth: '2026-07' } }
export const Light: Story = { globals: { theme: 'light' } }
