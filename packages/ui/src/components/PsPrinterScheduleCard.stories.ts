import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsPrinterScheduleCard from './PsPrinterScheduleCard.vue'

const ENTRIES = [
  {
    id: 's1',
    title: 'Halterung v2',
    timeLabel: '08:00 – 11:30',
    kind: 'job' as const,
    subtitle: 'Bestellung #1042 · PLA Schwarz',
  },
  {
    id: 's2',
    title: 'Gehäuse-Deckel',
    timeLabel: '12:00 – 15:45',
    kind: 'job' as const,
    subtitle: 'Bestellung #1043 · PETG Grau',
  },
  {
    id: 's3',
    title: 'Kleinserie Knöpfe',
    timeLabel: '16:00 – 19:20',
    kind: 'job' as const,
  },
]

const meta: Meta<typeof PsPrinterScheduleCard> = {
  title: 'Admin/PrinterScheduleCard',
  component: PsPrinterScheduleCard,
  args: { printerName: 'Prusa MK4 #1', entries: ENTRIES },
  render: (args) => ({
    components: { PsPrinterScheduleCard },
    setup: () => ({ args }),
    template: '<div class="max-w-md"><PsPrinterScheduleCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsPrinterScheduleCard>

export const Default: Story = {}

export const MitKonflikt: Story = {
  args: {
    entries: [
      ENTRIES[0]!,
      {
        id: 's4',
        title: 'Express-Nachdruck',
        timeLabel: '11:00 – 13:30',
        kind: 'job' as const,
        subtitle: 'Überschneidet sich mit Halterung v2',
        conflict: true,
      },
      ENTRIES[2]!,
    ],
  },
}

export const Leer: Story = { args: { entries: [] } }

export const MitWartung: Story = {
  args: {
    entries: [
      ENTRIES[0]!,
      {
        id: 's5',
        title: 'Düsenwechsel',
        timeLabel: '12:00 – 13:00',
        kind: 'maintenance' as const,
        subtitle: 'Geplante Wartung',
      },
      ENTRIES[1]!,
    ],
  },
}
