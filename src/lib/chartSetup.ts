import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartDataset,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import zoomPlugin from 'chartjs-plugin-zoom'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin, annotationPlugin)

/** Циклическая палитра линий графика — 12 цветов, как в старом приложении. */
export const RACE_GRAPH_PALETTE = [
  '#1E88E5', '#D81B60', '#43A047', '#FB8C00',
  '#8E24AA', '#00ACC1', '#F4511E', '#3949AB',
  '#6D4C41', '#C0CA33', '#00897B', '#E53935',
]

export function raceGraphColor(index: number): string {
  return RACE_GRAPH_PALETTE[index % RACE_GRAPH_PALETTE.length]
}

export type LineDataset = ChartDataset<'line', { x: number; y: number }[]>
