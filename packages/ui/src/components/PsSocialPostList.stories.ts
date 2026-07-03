import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPostList from './PsSocialPostList.vue'
import { SAMPLE_POSTS } from './social-story-fixtures.js'

const meta: Meta<typeof PsSocialPostList> = {
  title: 'Social/SocialPostList',
  component: PsSocialPostList,
  args: { posts: SAMPLE_POSTS },
  render: (args) => ({
    components: { PsSocialPostList },
    setup: () => ({ args }),
    template: '<PsSocialPostList v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPostList>

export const AlleStatus: Story = {}
export const NurFehlgeschlagen: Story = { args: { posts: [SAMPLE_POSTS[3]!] } }
export const LeererZustand: Story = { args: { posts: [] } }
export const Busy: Story = { args: { busy: true } }
export const Light: Story = { globals: { theme: 'light' } }
