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
import { buildScoreGraphData, sortedForResults } from '../lib/splitsTable'

const DEFAULT_VISIBLE_COUNT = 10
const TIME_LIMIT_COLOR = '#E65100'

export function ScoreGraphPage() {
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
    const sorted = sortedForResults(groupParticipants, results, 'BY_CHOICE')
    return buildScoreGraphData(sorted, results, distance, group?.timeLimitMinutes)
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

  // Датасеты для ВСЕХ участников всегда присутствуют в массиве — видимость управляется через
  // нативный флаг Chart.js `hidden`, а не фильтрацией массива. react-chartjs-2 сопоставляет старые
  // и новые датасеты между рендерами по label; если участника убирать из массива при снятии
  // чекбокса, а потом добавлять обратно, это сопоставление сбивается и линия перестаёт
  // отрисовываться, хотя данные в chartData уже снова её содержат.
  const chartData = {
    datasets: data.series.map((series) => {
      const originalIndex = data.series.indexOf(series)
      const color = raceGraphColor(originalIndex)
      const isDimmed = highlightedId != null && highlightedId !== series.participant.id
      return {
        label: `${series.participant.lastName} ${series.participant.firstName}`.trim(),
        data: series.points.map((p) => ({ x: p.elapsedSeconds, y: p.cumulativeScore })),
        borderColor: isDimmed ? `${color}40` : color,
        backgroundColor: color,
        pointRadius: 3,
        borderWidth: isDimmed ? 2 : 3,
        hidden: !effectiveVisibleIds.has(series.participant.id),
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
                x: { type: 'linear', title: { display: true, text: 'Время' }, ticks: { callback: (v) => formatTime(Number(v)) } },
                y: { title: { display: true, text: 'Очки' } },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (items) => (items[0] ? (chartData.datasets[items[0].datasetIndex].label ?? '') : ''),
                    label: (item) => `${formatTime(item.parsed.x ?? 0)} · ${item.parsed.y ?? 0} очк.`,
                  },
                },
                zoom: {
                  limits: { x: { min: 'original', max: 'original' } },
                  pan: { enabled: true, mode: 'x' },
                  zoom: { wheel: { enabled: true, speed: 0.02 }, pinch: { enabled: true }, mode: 'x' },
                },
                annotation:
                  data.timeLimitSeconds != null
                    ? {
                        annotations: {
                          timeLimit: {
                            type: 'line',
                            xMin: data.timeLimitSeconds,
                            xMax: data.timeLimitSeconds,
                            borderColor: TIME_LIMIT_COLOR,
                            borderWidth: 1.5,
                            borderDash: [6, 4],
                            label: { display: true, content: 'лимит', position: 'start', color: TIME_LIMIT_COLOR, backgroundColor: 'transparent' },
                          },
                        },
                      }
                    : undefined,
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
            // Не <button disabled> с вложенным чекбоксом: в Chromium disabled-предок останавливает
            // всплытие click/change от ЛЮБЫХ потомков, включая вложенный <input> — чекбокс нативно
            // переключается визуально, но React-обработчик не срабатывает и участника было не
            // включить обратно после скрытия. Обычный <div> + проверка isVisible внутри обработчика.
            <div
              key={series.participant.id}
              onClick={() => isVisible && setHighlightedId(isHighlighted ? null : series.participant.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left ${isHighlighted ? 'bg-primary-container' : ''}`}
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
            </div>
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
