import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { CompetitionCard } from '../features/competitions/CompetitionCard'
import { FilterSheet } from '../features/competitions/FilterSheet'
import {
  EMPTY_FILTER,
  isFilterEmpty,
  useMyCompetitions,
  usePublicCompetitions,
  type CompetitionsFilter,
} from '../features/competitions/hooks'
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
  const isLoggedIn = useIsLoggedIn()
  const showTabs = isDebugEnvironment()

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePublicCompetitions(filter)
  const competitions = data?.pages.flatMap((page) => page.items) ?? []

  const {
    data: myCompetitions,
    isLoading: isMyLoading,
    isError: isMyError,
    error: myError,
  } = useMyCompetitions(selectedTab === 'mine' && isLoggedIn)

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
        !isLoggedIn ? (
          <EmptyState text="Войдите в аккаунт, чтобы увидеть свои соревнования" />
        ) : isMyLoading ? (
          <Loading />
        ) : isMyError ? (
          <ErrorMessage message={(myError as Error).message} />
        ) : !myCompetitions || myCompetitions.length === 0 ? (
          <EmptyState text="Нет соревнований" />
        ) : (
          <div className="flex flex-col gap-2 p-4">
            {myCompetitions.map((competition) => (
              <CompetitionCard
                key={competition.competitionId}
                competition={competition.competition}
                onClick={() => navigate(`/competition/${competition.competitionId}`)}
              />
            ))}
          </div>
        )
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
