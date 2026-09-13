import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useSearchClubs } from '../features/clubs/hooks'

export function ClubsPage() {
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearchClubs(debouncedQuery)
  const clubs = data?.pages.flatMap((page) => page.items) ?? []

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

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h1 className="text-lg font-medium text-fg">Клубы</h1>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/ratings')} className="text-sm text-primary">
            Рейтинги
          </button>
          {isLoggedIn && (
            <button type="button" onClick={() => navigate('/clubs/my-join-requests')} className="text-sm text-primary">
              Мои заявки
            </button>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск клуба"
          className="flex-1 rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => navigate('/clubs/create')}
            className="rounded-md bg-primary px-3 py-2 text-sm text-on-primary"
          >
            + Создать
          </button>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : clubs.length === 0 ? (
        <EmptyState text="Клубы не найдены" />
      ) : (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => navigate(`/clubs/${club.id}`)}
              className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 text-left"
            >
              <span className="text-base font-medium text-fg">{club.name}</span>
              {club.description?.trim() && (
                <span className="line-clamp-2 text-sm text-on-surface-variant">{club.description}</span>
              )}
              <span className="text-xs text-on-surface-variant">Участников: {club.membersCount}</span>
            </button>
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && <Loading />}
        </div>
      )}
    </div>
  )
}
