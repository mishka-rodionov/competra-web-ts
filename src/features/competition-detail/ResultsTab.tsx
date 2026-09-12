import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { formatTime } from '../../lib/dateUtils'
import type { ParticipantGroupDetail } from '../../types/competition'
import type { OrienteeringParticipant, OrienteeringResult } from '../../types/participant'
import { resultStatusColorClass, resultStatusLabel } from '../competitions/labels'
import { useParticipants, useResults } from './hooks'

const LIVE_STATUSES = new Set(['IN_PROGRESS', 'STARTED'])

interface ResultsTabProps {
  competitionId: string
  groups: ParticipantGroupDetail[]
  competitionStatus: string
  resultsStatus: string
  direction: string
}

/**
 * Кнопки «Сплиты» / «График» из старого приложения (детальные страницы группового сплита и
 * интерактивных графиков гонки/очков) — отдельная вертикаль, пока не перенесены.
 */
export function ResultsTab({ competitionId, groups, competitionStatus, resultsStatus, direction }: ResultsTabProps) {
  const isByChoice = direction === 'BY_CHOICE'
  const { data: results, isLoading, isError, error } = useResults(competitionId, competitionStatus)
  const { data: participants } = useParticipants(competitionId)

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />
  if (!results || results.length === 0) return <EmptyState text="Результаты ещё не опубликованы" />

  const participantsById = new Map((participants ?? []).map((p) => [p.id, p]))
  const groupOrder = groups.map((g) => g.groupId)
  const resultsByGroup = new Map<number, OrienteeringResult[]>()
  for (const r of results) {
    const list = resultsByGroup.get(r.groupId) ?? []
    list.push(r)
    resultsByGroup.set(r.groupId, list)
  }
  const extraGroupIds = [...resultsByGroup.keys()].filter((id) => !groupOrder.includes(id))
  const sortedGroupIds = [...new Set([...groupOrder, ...extraGroupIds])].filter(
    (id) => (resultsByGroup.get(id)?.length ?? 0) > 0,
  )
  const groupNamesById = new Map(groups.map((g) => [g.groupId, g.title]))
  const isLive = LIVE_STATUSES.has(competitionStatus)

  return (
    <div className="flex flex-col gap-3 p-4">
      {(isLive || resultsStatus === 'PRELIMINARY') && (
        <div className="flex gap-2">
          {isLive && (
            <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-error">
              LIVE — обновляется автоматически
            </span>
          )}
          {resultsStatus === 'PRELIMINARY' && (
            <span className="rounded-full bg-surface-variant px-3 py-1 text-xs font-medium text-on-surface-variant">
              Результаты предварительные
            </span>
          )}
        </div>
      )}
      {sortedGroupIds.map((groupId) => {
        const groupResults = [...(resultsByGroup.get(groupId) ?? [])].sort((a, b) => {
          const rankA = a.status === 'DSQ' ? Infinity : (a.rank ?? Infinity)
          const rankB = b.status === 'DSQ' ? Infinity : (b.rank ?? Infinity)
          return rankA - rankB
        })
        return (
          <GroupResultsCard
            key={groupId}
            groupTitle={groupNamesById.get(groupId) ?? `Группа ${groupId}`}
            groupResults={groupResults}
            isByChoice={isByChoice}
            participantsById={participantsById}
          />
        )
      })}
    </div>
  )
}

interface GroupResultsCardProps {
  groupTitle: string
  groupResults: OrienteeringResult[]
  isByChoice: boolean
  participantsById: Map<string, OrienteeringParticipant>
}

function GroupResultsCard({ groupTitle, groupResults, isByChoice, participantsById }: GroupResultsCardProps) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-fg">{groupTitle}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
            <th className="py-1 pr-2 font-normal">#</th>
            <th className="py-1 pr-2 font-normal">Участник</th>
            {isByChoice && <th className="py-1 pr-2 font-normal">Очки</th>}
            <th className="py-1 pr-2 font-normal">Время</th>
            <th className="py-1 font-normal">Статус</th>
          </tr>
        </thead>
        <tbody>
          {groupResults.map((result) => {
            const participant = participantsById.get(result.participantId)
            const name = participant ? `${participant.lastName} ${participant.firstName}` : `Участник ${result.participantId}`
            return (
              <tr key={result.id} className="border-b border-outline-variant last:border-0">
                <td className="py-2 pr-2 text-fg">{result.rank ?? '—'}</td>
                <td className="py-2 pr-2">
                  <div className="text-fg">{name}</div>
                  {participant?.startNumber && (
                    <div className="text-xs text-on-surface-variant">№{participant.startNumber}</div>
                  )}
                </td>
                {isByChoice && <td className="py-2 pr-2 text-fg">{result.totalScore ?? '—'}</td>}
                <td className="py-2 pr-2 text-fg">{result.totalTime != null ? formatTime(result.totalTime) : '—'}</td>
                <td className={`py-2 text-xs font-medium ${resultStatusColorClass(result.status)}`}>
                  {resultStatusLabel(result.status)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
