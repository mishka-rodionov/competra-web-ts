import type { Chart as ChartJS } from 'chart.js'
import { useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useCompetitionDetail, useDistances, useParticipants, useResults } from '../features/competition-detail/hooks'
import '../lib/chartSetup'
import { raceGraphColor } from '../lib/chartSetup'
import { formatTime } from '../lib/dateUtils'
import { buildRaceGraphData, buildSplitsTable, sortedForResults } from '../lib/splitsTable'

const DEFAULT_VISIBLE_COUNT = 10

export function RaceGraphPage() {
  const { id, groupId } = useParams<{ id: string; groupId: string }>()
  const competitionId = id!
  const numericGroupId = Number(groupId)
  const navigate = useNavigate()
  const chartRef = useRef<ChartJS<'line'>>(null)

  const { data: detail, isLoading: detailLoading, isError, error } = useCompetitionDetail(competitionId)
  const { data: participants, isLoading: participantsLoading } = useParticipants(competitionId)
  const { data: results, isLoading: resultsLoading } = useResults(competitionId, detail?.status ?? '')
  const { data: distances } = useDistances(competitionId)

  const group = detail?.participantGroups.find((g) => g.groupId === numericGroupId)
  const isLoading = detailLoading || participantsLoading || resultsLoading

  const data = useMemo(() => {
    if (!participants || !results || !detail) return null
    const groupParticipants = participants.filter((p) => p.groupId === numericGroupId)
    const distance = distances?.find((d) => d.id === group?.distanceId)
    const sorted = sortedForResults(groupParticipants, results)
    const table = buildSplitsTable(sorted, results, distance)
    return buildRaceGraphData(table)
  }, [participants, results, detail, distances, group, numericGroupId])

  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const effectiveVisibleIds =
    visibleIds ??
    new Set(
      (data?.series ?? [])
        .slice()
        .sort((a, b) => (a.result?.rank ?? Infinity) - (b.result?.rank ?? Infinity))
        .slice(0, DEFAULT_VISIBLE_COUNT)
        .map((s) => s.participant.id),
    )

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />
  if (!data || data.series.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
        <Header groupTitle={group?.title} onBack={() => navigate(-1)} />
        <p className="p-4 text-on-surface-variant">Нет финишировавших участников для графика</p>
      </div>
    )
  }

  const columnLabels = new Map<number, string>([[0, 'Старт'], ...data.columns.map((c) => [c.positionIndex, `КП${c.controlPoint}`] as const)])
  const visibleSeries = data.series.filter((s) => effectiveVisibleIds.has(s.participant.id))

  const chartData = {
    datasets: visibleSeries.map((series) => {
      const originalIndex = data.series.indexOf(series)
      const color = raceGraphColor(originalIndex)
      const isDimmed = highlightedId != null && highlightedId !== series.participant.id
      return {
        label: `${series.participant.lastName} ${series.participant.firstName}`.trim(),
        data: series.points.filter((p) => p.deltaSeconds != null).map((p) => ({ x: p.positionIndex, y: p.deltaSeconds! })),
        borderColor: isDimmed ? `${color}40` : color,
        backgroundColor: color,
        pointRadius: 3,
        borderWidth: isDimmed ? 2 : 3,
      }
    }),
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <Header groupTitle={group?.title} onBack={() => navigate(-1)} />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex justify-end">
          <button type="button" onClick={() => chartRef.current?.resetZoom()} className="rounded-md border border-outline px-3 py-1 text-xs text-fg">
            Сбросить масштаб
          </button>
        </div>
        <div style={{ height: 320 }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={{
              animation: false,
              maintainAspectRatio: false,
              scales: {
                x: { type: 'linear', ticks: { callback: (v) => columnLabels.get(Number(v)) ?? v, stepSize: 1 } },
                y: { reverse: true, title: { display: true, text: 'Отставание от лидера' }, ticks: { callback: (v) => formatTime(Number(v)) } },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (items) => (items[0] ? (chartData.datasets[items[0].datasetIndex].label ?? '') : ''),
                    label: (item) => {
                      const x = item.parsed.x ?? 0
                      const delta = item.parsed.y ?? 0
                      const label = columnLabels.get(x) ?? `#${x}`
                      return `${label} · ${delta === 0 ? 'Лидер' : formatTime(delta)}`
                    },
                  },
                },
                zoom: {
                  limits: { x: { min: 'original', max: 'original' } },
                  pan: { enabled: true, mode: 'x' },
                  zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
                },
              },
            }}
          />
        </div>

        <h2 className="mt-2 text-base font-medium text-fg">Участники</h2>
        {data.series.map((series) => {
          const originalIndex = data.series.indexOf(series)
          const isVisible = effectiveVisibleIds.has(series.participant.id)
          const isHighlighted = highlightedId === series.participant.id
          return (
            <button
              key={series.participant.id}
              type="button"
              disabled={!isVisible}
              onClick={() => setHighlightedId(isHighlighted ? null : series.participant.id)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left ${isHighlighted ? 'bg-primary-container' : ''}`}
            >
              <input
                type="checkbox"
                checked={isVisible}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const next = new Set(effectiveVisibleIds)
                  if (e.target.checked) next.add(series.participant.id)
                  else {
                    next.delete(series.participant.id)
                    if (isHighlighted) setHighlightedId(null)
                  }
                  setVisibleIds(next)
                }}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: raceGraphColor(originalIndex) }} />
              <span className={`text-sm text-fg ${isHighlighted ? 'font-bold' : ''}`}>
                {`${series.participant.lastName} ${series.participant.firstName}`.trim()}
                {series.result?.rank != null ? ` · Место ${series.result.rank}` : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Header({ groupTitle, onBack }: { groupTitle: string | undefined; onBack: () => void }) {
  return (
    <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
      <button type="button" onClick={onBack} aria-label="Назад" className="px-2 text-xl">
        ←
      </button>
      <h1 className="text-lg font-medium">График: {groupTitle ?? ''}</h1>
    </header>
  )
}
