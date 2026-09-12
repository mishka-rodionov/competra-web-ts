import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clubRepository } from '../api/clubRepository'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useMyJoinRequests } from '../features/clubs/hooks'
import { joinRequestStatusColorClass, joinRequestStatusLabel } from '../features/clubs/labels'

export function MyJoinRequestsPage() {
  const navigate = useNavigate()
  const { data: requests, isLoading, isError, error } = useMyJoinRequests()
  const sorted = [...(requests ?? [])].sort((a, b) => b.createdAt - a.createdAt)
  const clubIds = [...new Set(sorted.map((r) => r.clubId))]

  const { data: clubNames } = useQuery({
    queryKey: ['club-names', clubIds],
    queryFn: async () => {
      const entries = await Promise.all(
        clubIds.map(async (clubId) => {
          const result = await clubRepository.getClub(clubId)
          return [clubId, result.kind === 'success' ? result.data.name : 'Клуб'] as const
        }),
      )
      return Object.fromEntries(entries)
    },
    enabled: clubIds.length > 0,
  })

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Мои заявки</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : sorted.length === 0 ? (
        <EmptyState text="Вы ещё не подавали заявок" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {sorted.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => navigate(`/clubs/${request.clubId}`)}
              className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3 text-left"
            >
              <span className="text-fg">{clubNames?.[request.clubId] ?? 'Клуб'}</span>
              <span className={`text-sm font-medium ${joinRequestStatusColorClass(request.status)}`}>
                {joinRequestStatusLabel(request.status)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
