<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps<{ stages: { stage: string; sessions: number }[] }>()

const LABELS: Record<string, string> = {
  page_view: 'Seitenaufrufe',
  view_item: 'Produktansichten',
  add_to_cart: 'In den Warenkorb',
  begin_checkout: 'Checkout gestartet',
  purchase: 'Kauf',
}

const data = computed<ChartData<'bar'>>(() => ({
  labels: props.stages.map((s) => LABELS[s.stage] ?? s.stage),
  datasets: [
    {
      label: 'Sessions',
      data: props.stages.map((s) => s.sessions),
      backgroundColor: 'rgba(13, 148, 136, 0.75)',
      borderRadius: 4,
    },
  ],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        // Show drop-off vs. the previous stage.
        afterLabel: (ctx) => {
          const i = ctx.dataIndex
          if (i === 0) return ''
          const prev = props.stages[i - 1]?.sessions ?? 0
          const cur = props.stages[i]?.sessions ?? 0
          if (prev === 0) return ''
          return `${((cur / prev) * 100).toFixed(0)} % der vorherigen Stufe`
        },
      },
    },
  },
  scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
}))
</script>

<template>
  <div style="height: 240px">
    <Bar :data="data" :options="options" />
  </div>
</template>
