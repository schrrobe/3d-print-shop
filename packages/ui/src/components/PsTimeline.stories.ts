import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsTimeline from './PsTimeline.vue'

const meta: Meta<typeof PsTimeline> = {
  title: 'Admin/Timeline',
  component: PsTimeline,
  args: {
    entries: [
      {
        id: 'e4',
        title: 'Zugestellt',
        timestampLabel: '02.07.2026, 11:42',
        note: 'Übergabe an Empfänger.',
        actor: 'DHL',
      },
      {
        id: 'e3',
        title: 'Versendet',
        timestampLabel: '30.06.2026, 16:05',
        note: 'Sendung an DHL übergeben, Tracking 00340434161094042557.',
        actor: 'Robert',
      },
      {
        id: 'e2',
        title: 'Verpackt',
        timestampLabel: '30.06.2026, 14:20',
        actor: 'Robert',
      },
      {
        id: 'e1',
        title: 'Versandbereit',
        timestampLabel: '29.06.2026, 09:10',
        note: 'QC bestanden.',
      },
    ],
  },
  render: (args) => ({
    components: { PsTimeline },
    setup: () => ({ args }),
    template: '<div class="max-w-[32rem]"><PsTimeline v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsTimeline>

export const Default: Story = {}

export const Empty: Story = {
  args: { entries: [] },
}

export const EinEintrag: Story = {
  args: {
    entries: [
      {
        id: 'e1',
        title: 'Reklamation eingegangen',
        timestampLabel: '28.06.2026, 08:32',
        note: 'Kunde meldet Transportschaden mit zwei Fotos.',
        actor: 'System',
      },
    ],
  },
}
