import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tokenStorage } from '../auth/tokenStorage'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { CompetitionCard } from '../features/competitions/CompetitionCard'
import { FilterSheet } from '../features/competitions/FilterSheet'
import { EMPTY_FILTER, isFilterEmpty, usePublicCompetitions, type CompetitionsFilter } from '../features/competitions/hooks'
import { isDebugEnvironment } from '../lib/debugEnv'

const TABS = [
  { key: 'public', label: 'Публичные' },
  { key: 'mine', label: 'Мои' },
]

export function CompetitionsPage() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState<'public' | 'mine'>('public')
  const [filter, setFilter] = useState<CompetitionsFilter>(EMPTY_FILTER)
  const [draftFilter, setDraftFilter] = useState<CompetitionsFilter>(EMPTY_FILTER)
  const [showFilter, setShowFilter] = useState(false)
  // "Мои" пока не реализовано (нужна авторизация — вертикаль 2), проверка isLoggedIn
  // здесь только чтобы показать правильное пустое состояние, как в старом приложении.
  const [isLoggedIn] = useState(() => tokenStorage.isLoggedIn())
  const showTabs = isDebugEnvironment()

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePublicCompetitions(filter)
  const competitions = data?.pages.flatMap((page) => page.items) ?? []

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  function openFilter() {
    setDraftFilter(filter)
    setShowFilter(true)
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h1 className="text-lg font-medium text-fg">Соревнования</h1>
        {selectedTab === 'public' && (
          <button type="button" onClick={openFilter} className="text-sm text-primary">
            {isFilterEmpty(filter) ? 'Фильтр' : 'Фильтр ●'}
          </button>
        )}
      </header>

      {showTabs && <TabBar tabs={TABS} active={selectedTab} onChange={(key) => setSelectedTab(key as 'public' | 'mine')} />}

      {selectedTab === 'mine' ? (
        <EmptyState text={isLoggedIn ? 'Нет соревнований' : 'Войдите в аккаунт, чтобы увидеть свои соревнования'} />
      ) : isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : competitions.length === 0 ? (
        <EmptyState text="Нет соревнований" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {competitions.map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition}
              onClick={() => competition.id && navigate(`/competition/${competition.id}`)}
            />
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && <Loading />}
        </div>
      )}

      {showFilter && (
        <FilterSheet
          draft={draftFilter}
          onChange={setDraftFilter}
          onApply={() => {
            setFilter(draftFilter)
            setShowFilter(false)
          }}
          onReset={() => {
            setFilter(EMPTY_FILTER)
            setDraftFilter(EMPTY_FILTER)
            setShowFilter(false)
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  )
}
