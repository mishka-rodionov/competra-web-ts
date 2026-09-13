import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useSearchRatings } from '../features/ratings/hooks'

export function RatingsSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearchRatings(debouncedQuery)
  const ratings = data?.pages.flatMap((page) => page.items) ?? []

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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Рейтинги</h1>
      </header>

      <div className="p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск рейтинга"
          className="w-full rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : ratings.length === 0 ? (
        <EmptyState text="Рейтинги не найдены" />
      ) : (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {ratings.map((rating) => (
            <button
              key={rating.id}
              type="button"
              onClick={() => navigate(`/ratings/${rating.id}`)}
              className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 text-left"
            >
              <span className="text-base font-medium text-fg">{rating.name}</span>
              <span className="text-sm text-on-surface-variant">{rating.ownerClubName}</span>
            </button>
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && <Loading />}
        </div>
      )}
    </div>
  )
}
