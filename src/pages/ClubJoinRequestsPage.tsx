import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { clubRepository } from '../api/clubRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { AuthFlow } from '../features/auth/AuthFlow'
import { useJoinRequestsForClub } from '../features/clubs/hooks'

export function ClubJoinRequestsPage() {
  const { id } = useParams<{ id: string }>()
  const clubId = id!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isLoggedIn = useIsLoggedIn()
  const { data: requests, isLoading, isError, error } = useJoinRequestsForClub(clubId)

  if (!isLoggedIn) {
    return <AuthFlow onLoginSuccess={() => {}} onPrivacyClick={() => navigate('/privacy')} />
  }

  const pending = (requests ?? []).filter((r) => r.status === 'PENDING')

  async function review(requestId: string, approve: boolean) {
    const result = await clubRepository.reviewJoinRequest(clubId, requestId, approve)
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['club-join-requests', clubId] })
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Заявки на вступление</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : pending.length === 0 ? (
        <EmptyState text="Нет входящих заявок" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {pending.map((request) => (
            <div key={request.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3">
              <span className="flex-1 text-fg">{`${request.lastName} ${request.firstName}`.trim()}</span>
              <button type="button" onClick={() => review(request.id, false)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
                Отклонить
              </button>
              <button type="button" onClick={() => review(request.id, true)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary">
                Одобрить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
