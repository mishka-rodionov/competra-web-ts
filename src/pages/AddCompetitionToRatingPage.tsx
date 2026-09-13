import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ratingRepository } from '../api/ratingRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { LoginForm } from '../features/auth/LoginForm'
import { EMPTY_FILTER, usePublicCompetitions } from '../features/competitions/hooks'
import { toLocaleDateString } from '../lib/dateUtils'

export function AddCompetitionToRatingPage() {
  const { id } = useParams<{ id: string }>()
  const ratingId = id!
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()

  const alreadyAdded = new Set((searchParams.get('exclude') ?? '').split(',').filter(Boolean))
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicCompetitions(EMPTY_FILTER)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={() => {}} onPrivacyClick={() => navigate('/privacy')} />
  }

  const availableCompetitions = (data?.pages.flatMap((page) => page.items) ?? []).filter((c) => !alreadyAdded.has(c.id))

  async function handleAdd(competitionId: string) {
    if (addingId) return
    setAddingId(competitionId)
    setAddError(null)
    const result = await ratingRepository.addCompetition(ratingId, competitionId)
    if (result.kind === 'success') {
      // Как и в старом приложении, всегда ведём на маппинг групп — даже с пустым списком
      // предложений (тогда страница сама покажет "В соревновании нет групп участников").
      navigate(`/ratings/${ratingId}/mapping/${competitionId}`, {
        state: { suggestions: result.data.groupMappingSuggestions },
      })
    } else {
      setAddError('Не удалось добавить соревнование')
      setAddingId(null)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Добавить соревнование</h1>
      </header>

      {addError && <ErrorMessage message={addError} />}

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : availableCompetitions.length === 0 ? (
        <EmptyState text="Нет доступных соревнований" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {availableCompetitions.map((competition) => (
            <button
              key={competition.id}
              type="button"
              disabled={addingId != null}
              onClick={() => handleAdd(competition.id)}
              className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3 text-left disabled:opacity-50"
            >
              <div>
                <div className="text-fg">{competition.title}</div>
                <div className="text-sm text-on-surface-variant">{toLocaleDateString(competition.startDate)}</div>
              </div>
              {addingId === competition.id && (
                <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
              )}
            </button>
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && <Loading />}
        </div>
      )}
    </div>
  )
}
