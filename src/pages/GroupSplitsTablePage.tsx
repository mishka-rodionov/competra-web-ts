import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useCompetitionDetail, useDistances, useParticipants, useResults } from '../features/competition-detail/hooks'
import { formatTime } from '../lib/dateUtils'
import { buildSplitsTable, sortedForResults } from '../lib/splitsTable'
import type { SplitsTableRow } from '../types/splits'

function formatKm(meters: number): string {
  const roundedTenths = Math.round(meters / 100)
  const km = Math.trunc(roundedTenths / 10)
  const tenths = roundedTenths % 10
  return `${km}.${tenths} км`
}

function formatPace(minPerKm: number): string {
  const totalSeconds = Math.max(0, Math.trunc(minPerKm * 60))
  const minutes = Math.trunc(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function scoreLabel(row: SplitsTableRow): string {
  const netScore = row.result?.totalScore ?? 0
  const penalty = row.result?.scorePenalty ?? 0
  const rawScore = row.rawScore ?? netScore + penalty
  return penalty > 0 ? `${rawScore} - ${penalty} (штраф) = ${netScore}` : `${netScore} очков`
}

export function GroupSplitsTablePage() {
  const { id, groupId } = useParams<{ id: string; groupId: string }>()
  const competitionId = id!
  const numericGroupId = Number(groupId)
  const navigate = useNavigate()

  const { data: detail, isLoading: detailLoading, isError, error } = useCompetitionDetail(competitionId)
  const { data: participants, isLoading: participantsLoading } = useParticipants(competitionId)
  const { data: results, isLoading: resultsLoading } = useResults(competitionId, detail?.status ?? '')
  const { data: distances } = useDistances(competitionId)

  const group = detail?.participantGroups.find((g) => g.groupId === numericGroupId)
  const isByChoice = detail?.direction === 'BY_CHOICE'
  const isLoading = detailLoading || participantsLoading || resultsLoading

  const table = useMemo(() => {
    if (!participants || !results || !detail) return null
    const groupParticipants = participants.filter((p) => p.groupId === numericGroupId)
    const distance = distances?.find((d) => d.id === group?.distanceId)
    const sorted = sortedForResults(groupParticipants, results, detail.direction)
    return buildSplitsTable(sorted, results, distance, detail.direction)
  }, [participants, results, detail, distances, group, numericGroupId])

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Сплиты: {group?.title ?? ''}</h1>
      </header>

      {!table || table.rows.length === 0 || table.columns.length === 0 ? (
        <p className="p-4 text-on-surface-variant">Сплиты по группе отсутствуют</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 w-36 bg-bg" />
                {table.columns.map((column) => (
                  <th key={column.positionIndex} className="w-19 px-1 py-1 text-center text-xs font-normal text-on-surface-variant">
                    {isByChoice ? `#${column.positionIndex}` : `#${column.positionIndex} (КП${column.controlPoint})`}
                  </th>
                ))}
                {isByChoice && <th className="w-19 px-1 py-1 text-center text-xs font-normal text-on-surface-variant">Дистанция</th>}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={row.participant.id} className={index % 2 === 0 ? 'bg-surface' : 'bg-surface-variant/30'}>
                  <td className="sticky left-0 w-36 bg-inherit px-1 py-1.5 align-top">
                    <div className="text-fg">{`${row.participant.lastName} ${row.participant.firstName}`.trim()}</div>
                    {isByChoice && <div className="text-xs text-on-surface-variant">{scoreLabel(row)}</div>}
                    {row.result?.rank != null && <div className="text-xs text-on-surface-variant">Место {row.result.rank}</div>}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="w-19 px-1 py-1.5 text-center align-top">
                      {isByChoice && cell.controlPoint != null && <div className="text-xs text-on-surface-variant">КП{cell.controlPoint}</div>}
                      <div className="text-xs text-on-surface-variant">{cell.cumulativeSeconds != null ? formatTime(cell.cumulativeSeconds) : '—'}</div>
                      <div className={cell.isBestLeg ? 'font-bold text-primary' : 'text-fg'}>
                        {cell.deltaSeconds != null ? formatTime(cell.deltaSeconds) : '—'}
                      </div>
                      {!isByChoice && cell.paceMinPerKm != null && (
                        <div className="text-xs text-on-surface-variant">{formatPace(cell.paceMinPerKm)}/км</div>
                      )}
                    </td>
                  ))}
                  {isByChoice && (
                    <td className="w-19 px-1 py-1.5 text-center align-top text-fg">
                      {row.totalDistanceMeters != null ? formatKm(row.totalDistanceMeters) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
