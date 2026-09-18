import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useRatingCompetitions, useStandings } from '../features/ratings/hooks'
import { toLocaleDateString } from '../lib/dateUtils'

export function AthleteStartsPage() {
  const { id, groupId, participantKey } = useParams<{ id: string; groupId: string; participantKey: string }>()
  const ratingId = id!
  const navigate = useNavigate()

  const { data: standings, isLoading, isError, error } = useStandings(ratingId, Number(groupId))
  const { data: competitions } = useRatingCompetitions(ratingId)

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />

  const standing = standings?.find((s) => s.participantKey === participantKey)
  if (!standing) return <ErrorMessage message="Спортсмен не найден" />

  const competitionsById = new Map((competitions ?? []).map((c) => [c.competitionId, c]))
  const starts = [...standing.breakdown].sort(
    (a, b) => (competitionsById.get(b.competitionId)?.competitionStartDate ?? 0) - (competitionsById.get(a.competitionId)?.competitionStartDate ?? 0),
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="flex-1 truncate text-lg font-medium">{standing.displayName}</h1>
      </header>

      {starts.length === 0 ? (
        <EmptyState text="Нет стартов" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {starts.map((entry) => {
            const competition = competitionsById.get(entry.competitionId)
            return (
              <button
                key={entry.competitionId}
                type="button"
                onClick={() => navigate(`/competition/${entry.competitionId}?tab=results`)}
                className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface p-3 text-left hover:bg-surface-variant/40"
              >
                <div className="flex-1">
                  <div className="text-fg">{competition?.competitionTitle ?? `Соревнование ${entry.competitionId}`}</div>
                  {competition && (
                    <div className="text-xs text-on-surface-variant">{toLocaleDateString(competition.competitionStartDate)}</div>
                  )}
                </div>
                <span className="text-sm text-on-surface-variant">
                  Место: <span className="text-base font-semibold text-primary">{entry.place ?? '—'}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
