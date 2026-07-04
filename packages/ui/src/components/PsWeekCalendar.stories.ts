import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsWeekCalendar from './PsWeekCalendar.vue'

const DAYS = [
  { date: '2026-07-06', label: 'Mo 06.07.' },
  { date: '2026-07-07', label: 'Di 07.07.' },
  { date: '2026-07-08', label: 'Mi 08.07.' },
  { date: '2026-07-09', label: 'Do 09.07.' },
  { date: '2026-07-10', label: 'Fr 10.07.' },
  { date: '2026-07-11', label: 'Sa 11.07.' },
  { date: '2026-07-12', label: 'So 12.07.' },
]

const RESOURCES = [
  { id: 'p1', name: 'Prusa MK4 #1' },
  { id: 'p2', name: 'Prusa MK4 #2' },
  { id: 'p3', name: 'Bambu X1C' },
]

const EVENTS = [
  {
    id: 'e1',
    resourceId: 'p1',
    date: '2026-07-06',
    title: 'Halterung v2',
    subtitle: 'Bestellung #1042',
    timeLabel: '08:00',
    kind: 'job' as const,
    status: 'printing',
  },
  {
    id: 'e2',
    resourceId: 'p1',
    date: '2026-07-08',
    title: 'Gehäuse-Deckel',
    timeLabel: '10:30',
    kind: 'job' as const,
    status: 'queued',
  },
  {
    id: 'e3',
    resourceId: 'p2',
    date: '2026-07-07',
    title: 'Zahnrad-Satz',
    subtitle: 'Bestellung #1044',
    timeLabel: '09:15',
    kind: 'job' as const,
    status: 'queued',
  },
  {
    id: 'e4',
    resourceId: 'p3',
    date: '2026-07-09',
    title: 'Prototyp Fassung',
    timeLabel: '13:00',
    kind: 'job' as const,
    status: 'queued',
  },
  {
    id: 'e5',
    resourceId: 'p3',
    date: '2026-07-11',
    title: 'Ersatzteil Clip',
    timeLabel: '07:45',
    kind: 'job' as const,
    status: 'queued',
  },
  {
    id: 'e6',
    resourceId: 'p2',
    date: '2026-07-10',
    title: 'Düsenwechsel',
    timeLabel: '14:00',
    kind: 'maintenance' as const,
  },
]

const meta: Meta<typeof PsWeekCalendar> = {
  title: 'Admin/WeekCalendar',
  component: PsWeekCalendar,
  args: { days: DAYS, resources: RESOURCES, events: EVENTS },
  render: (args) => ({
    components: { PsWeekCalendar },
    setup: () => ({ args }),
    template: '<PsWeekCalendar v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsWeekCalendar>

export const Default: Story = {}

export const Empty: Story = { args: { resources: [], events: [] } }

export const VieleEvents: Story = {
  args: {
    events: [
      ...EVENTS,
      {
        id: 'e7',
        resourceId: 'p1',
        date: '2026-07-06',
        title: 'Express-Nachdruck',
        timeLabel: '12:00',
        kind: 'job' as const,
        status: 'queued',
      },
      {
        id: 'e8',
        resourceId: 'p1',
        date: '2026-07-06',
        title: 'Kalibrierung',
        timeLabel: '17:30',
        kind: 'maintenance' as const,
      },
      {
        id: 'e9',
        resourceId: 'p1',
        date: '2026-07-06',
        title: 'Kleinserie Knöpfe',
        subtitle: 'Bestellung #1051',
        timeLabel: '19:00',
        kind: 'job' as const,
        status: 'queued',
      },
    ],
  },
}

export const Selected: Story = { args: { selectedEventId: 'e3' } }
