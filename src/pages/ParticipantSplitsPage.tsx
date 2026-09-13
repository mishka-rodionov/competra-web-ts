import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useParticipants, useResults } from '../features/competition-detail/hooks'
import { resultStatusLabel } from '../features/competitions/labels'
import { formatTime } from '../lib/dateUtils'

export function ParticipantSplitsPage() {
  const { id, participantId } = useParams<{ id: string; participantId: string }>()
  const competitionId = id!
  const navigate = useNavigate()

  const { data: participants, isLoading: participantsLoading, isError, error } = useParticipants(competitionId)
  const { data: results, isLoading: resultsLoading } = useResults(competitionId, '')

  const participant = participants?.find((p) => p.id === participantId)
  const result = results?.find((r) => r.participantId === participantId)
  const isLoading = participantsLoading || resultsLoading

  const splits = result?.splits ?? []
  const startTs = result?.startTime ?? participant?.startTime ?? null

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Сплиты участника</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !participant ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Участник не найден'} />
      ) : (
        <div className="flex flex-col gap-3 p-4">
          <div className="rounded-lg border border-outline-variant bg-surface p-4">
            <p className="text-base font-medium text-fg">{`${participant.lastName} ${participant.firstName}`.trim()}</p>
            {participant.startNumber && <p className="text-sm text-on-surface-variant">№{participant.startNumber}</p>}
            {participant.groupName && <p className="text-sm text-on-surface-variant">{participant.groupName}</p>}
          </div>

          {result && (
            <div className="flex justify-between rounded-lg border border-outline-variant bg-surface p-4">
              <SummaryColumn label="Место" value={result.rank?.toString() ?? '—'} />
              <SummaryColumn label="Общее время" value={result.totalTime != null ? formatTime(result.totalTime) : '—'} />
              <SummaryColumn label="Статус" value={resultStatusLabel(result.status)} />
            </div>
          )}

          <h2 className="pt-1 text-sm font-medium text-fg">Сплиты по пунктам</h2>
          <hr className="border-outline-variant" />

          {splits.length === 0 || startTs == null ? (
            <p className="pt-2 text-base text-on-surface-variant">Сплиты отсутствуют</p>
          ) : (
            <>
              <div className="flex py-1 text-xs text-on-surface-variant">
                <span className="w-16">КП</span>
                <span className="flex-1">Круг</span>
                <span className="flex-1">Время</span>
              </div>
              <hr className="border-outline-variant" />
              {splits.map((split, i) => {
                const prevTs = i === 0 ? startTs : splits[i - 1].timestamp
                const legSeconds = (split.timestamp - prevTs) / 1000
                const cumulSeconds = (split.timestamp - startTs) / 1000
                return (
                  <div key={i}>
                    <div className="flex items-center py-1.5">
                      <span className="w-16 text-base text-fg">{split.controlPoint}</span>
                      <span className="flex-1 text-base text-fg">{formatTime(legSeconds)}</span>
                      <span className="flex-1 text-base text-fg">{formatTime(cumulSeconds)}</span>
                    </div>
                    <hr className="border-outline-variant" />
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <span className="text-sm font-medium text-fg">{value}</span>
    </div>
  )
}
