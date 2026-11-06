import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ratingRepository } from '../api/ratingRepository'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { useClubMembers } from '../features/clubs/hooks'
import { useUserProfile } from '../features/profile/hooks'
import { CompetitionRatingCard } from '../features/ratings/CompetitionRatingCard'
import { useRating, useRatingCompetitions, useStandings } from '../features/ratings/hooks'
import { MergeStandingsDialog } from '../features/ratings/MergeStandingsDialog'
import { RatingPointsInfoDialog } from '../features/ratings/RatingPointsInfoDialog'
import { RatingStandingRow } from '../features/ratings/RatingStandingRow'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'
import type { RatingStanding } from '../types/rating'

export function RatingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ratingId = id!
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: rating, isLoading, isError, error } = useRating(ratingId)
  const { data: competitions } = useRatingCompetitions(ratingId)
  const { data: clubMembers } = useClubMembers(rating?.ownerClubId ?? '')
  const { data: profile } = useUserProfile()

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPointsInfo, setShowPointsInfo] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  // Режим ручного выбора строк для объединения (если дубль не подсказан — например, опечатка в фамилии).
  const [selectingForMerge, setSelectingForMerge] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [mergingEntries, setMergingEntries] = useState<RatingStanding[] | null>(null)

  const effectiveGroupId = selectedGroupId ?? rating?.groups[0]?.id ?? null
  const { data: standingsResponse, isLoading: standingsLoading } = useStandings(ratingId, effectiveGroupId)
  const standings = standingsResponse?.standings
  const standingByKey = new Map((standings ?? []).map((s) => [s.participantKey, s]))
  const duplicateGroups = (standingsResponse?.possibleDuplicates ?? [])
    .map((keys) => keys.map((k) => standingByKey.get(k)).filter((s): s is RatingStanding => s != null))
    .filter((group) => group.length > 1)

  function exitSelection() {
    setSelectingForMerge(false)
    setSelectedKeys([])
  }

  function toggleSelected(key: string) {
    setSelectedKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))
  }

  const myRole = clubMembers?.find((m) => m.userId === profile?.id)?.role
  const isAdmin = myRole === 'FOUNDER' || myRole === 'ADMIN'
  const alreadyAddedIds = (competitions ?? []).map((c) => c.competitionId).join(',')

  async function handleDelete() {
    const result = await ratingRepository.deleteRating(ratingId)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.ratingDeleted(ratingId))
      navigate('/ratings')
    } else setActionError('Не удалось удалить рейтинг')
    setShowDeleteConfirm(false)
  }

  async function handleRemoveCompetition(competitionId: string) {
    const result = await ratingRepository.removeCompetition(ratingId, competitionId)
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['rating-competitions', ratingId] })
    } else {
      setActionError('Не удалось удалить соревнование')
    }
  }

  if (isLoading) return <Loading />
  if (isError || !rating) {
    return <ErrorMessage message={isError ? (error as Error).message : 'Рейтинг не найден'} />
  }

  const groupTabs = rating.groups.map((g) => ({ key: String(g.id), label: g.title }))

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="flex-1 truncate text-lg font-medium">{rating.name}</h1>
        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => navigate(`/ratings/${ratingId}/add-competition?exclude=${alreadyAddedIds}`)}
              className="text-sm text-primary"
            >
              Добавить старт
            </button>
            <button type="button" onClick={() => navigate(`/ratings/${ratingId}/edit`)} className="text-sm text-fg">
              Редактировать
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-sm text-error">
              Удалить
            </button>
          </div>
        )}
      </header>

      {actionError && <ErrorMessage message={actionError} />}

      <div className="flex flex-1 flex-col gap-4 p-4 md:grid md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-3">
          {rating.groups.length === 0 ? (
            <EmptyState text="В рейтинге нет групп зачёта" />
          ) : (
            <>
              <TabBar
                tabs={groupTabs}
                active={String(effectiveGroupId)}
                onChange={(key) => {
                  exitSelection()
                  setSelectedGroupId(Number(key))
                }}
              />
              <button
                type="button"
                onClick={() => setShowPointsInfo(true)}
                className="self-start text-sm text-primary underline"
              >
                ⓘ Как начисляются очки
              </button>
              {isAdmin && duplicateGroups.length > 0 && !selectingForMerge && (
                <div className="flex flex-col gap-2 rounded-lg border border-secondary bg-secondary/10 p-3">
                  <span className="text-sm font-semibold text-fg">Похоже, это один человек</span>
                  {duplicateGroups.map((group) => (
                    <div key={group.map((g) => g.participantKey).join('|')} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-fg">
                        {group.map((g) => `${g.lastName} ${g.firstName}${g.userId ? ' (аккаунт)' : ''}`).join(' · ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMergingEntries(group)}
                        className="shrink-0 rounded-md border border-outline px-3 py-1 text-sm text-fg"
                      >
                        Объединить
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && standings && standings.length > 1 && (
                <div className="flex flex-wrap items-center gap-3">
                  {selectingForMerge ? (
                    <>
                      <span className="text-sm text-on-surface-variant">Отметьте записи одного человека</span>
                      <button
                        type="button"
                        disabled={selectedKeys.length < 2}
                        onClick={() =>
                          setMergingEntries(selectedKeys.map((k) => standingByKey.get(k)).filter((x): x is RatingStanding => x != null))
                        }
                        className="rounded-md bg-primary px-3 py-1 text-sm text-on-primary disabled:opacity-50"
                      >
                        Объединить ({selectedKeys.length})
                      </button>
                      <button type="button" onClick={exitSelection} className="text-sm text-fg">
                        Отмена
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setSelectingForMerge(true)} className="text-sm text-primary underline">
                      Объединить записи вручную
                    </button>
                  )}
                </div>
              )}
              {standingsLoading ? (
                <Loading />
              ) : !standings || standings.length === 0 ? (
                <EmptyState text="Пока нет данных" />
              ) : (
                <div className="flex flex-col gap-2">
                  {standings.map((standing) => (
                    <RatingStandingRow
                      key={standing.participantKey}
                      standing={standing}
                      selectable={selectingForMerge}
                      selected={selectedKeys.includes(standing.participantKey)}
                      onClick={() =>
                        selectingForMerge
                          ? toggleSelected(standing.participantKey)
                          : navigate(`/ratings/${ratingId}/athlete/${effectiveGroupId}/${encodeURIComponent(standing.participantKey)}`)
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-fg">Соревнования рейтинга</h2>
          {!competitions || competitions.length === 0 ? (
            <EmptyState text="Соревнований пока нет" />
          ) : (
            competitions.map((rc) => (
              <CompetitionRatingCard
                key={rc.id}
                competition={rc}
                isAdmin={isAdmin}
                onMappingClick={() => navigate(`/ratings/${ratingId}/mapping/${rc.competitionId}`)}
                onRemove={() => handleRemoveCompetition(rc.competitionId)}
              />
            ))
          )}
        </div>
      </div>

      {showPointsInfo && <RatingPointsInfoDialog onDismiss={() => setShowPointsInfo(false)} />}

      {mergingEntries && effectiveGroupId != null && (
        <MergeStandingsDialog
          ratingId={ratingId}
          ratingGroupId={effectiveGroupId}
          entries={mergingEntries}
          onDismiss={() => setMergingEntries(null)}
          onMerged={() => {
            setMergingEntries(null)
            exitSelection()
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить рейтинг?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">Действие необратимо.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg"
              >
                Отмена
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-md bg-error px-4 py-2 text-sm text-on-error">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
