<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
)

const props = defineProps<{
  points: { day: string; sessions: number; purchases: number; revenueCents: number }[]
}>()

const data = computed<ChartData<'bar'>>(() => ({
  labels: props.points.map((p) => p.day.slice(5)),
  datasets: [
    {
      type: 'bar',
      label: 'Umsatz (€)',
      data: props.points.map((p) => Math.round(p.revenueCents) / 100),
      backgroundColor: 'rgba(13, 148, 136, 0.65)',
      borderRadius: 4,
      yAxisID: 'yRevenue',
      order: 2,
    },
    {
      // A line dataset inside a bar chart — the BarController tolerates mixed types.
      type: 'line' as const,
      label: 'Käufe',
      data: props.points.map((p) => p.purchases),
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b',
      tension: 0.3,
      yAxisID: 'yCount',
      order: 1,
    } as unknown as ChartData<'bar'>['datasets'][number],
  ],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { position: 'bottom' } },
  scales: {
    yRevenue: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      title: { display: true, text: 'Umsatz (€)' },
    },
    yCount: {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      ticks: { precision: 0 },
      title: { display: true, text: 'Käufe' },
    },
  },
}))
</script>

<template>
  <div>
    <div style="height: 260px" role="img" aria-label="Umsatz und Käufe pro Tag (Diagramm)">
      <Bar v-if="points.length" :data="data" :options="options" />
      <p v-else class="text-caption text-secondary">Keine Daten im Zeitraum.</p>
    </div>
    <!-- Screen-reader / keyboard alternative for the canvas chart. -->
    <table v-if="points.length" class="sr-only">
      <caption>
        Umsatz und Käufe pro Tag
      </caption>
      <thead>
        <tr>
          <th scope="col">Tag</th>
          <th scope="col">Umsatz (€)</th>
          <th scope="col">Käufe</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in points" :key="p.day">
          <td>{{ p.day }}</td>
          <td>{{ (Math.round(p.revenueCents) / 100).toFixed(2) }}</td>
          <td>{{ p.purchases }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
