import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ratingRepository } from '../api/ratingRepository'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LabeledSelect } from '../components/LabeledSelect'
import { Loading } from '../components/Loading'
import { useRating } from '../features/ratings/hooks'
import type { RatingGroupMappingSuggestion } from '../types/rating'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'

const NO_MAPPING = 0

export function GroupMappingPage() {
  const { id, competitionId } = useParams<{ id: string; competitionId: string }>()
  const ratingId = id!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()

  // Если пришли из AddCompetitionToRatingPage, предложения уже загружены той страницей —
  // не дёргаем сеть повторно за теми же данными (как и в старом приложении).
  const passedSuggestions = (location.state as { suggestions?: RatingGroupMappingSuggestion[] } | null)?.suggestions

  const { data: rating } = useRating(ratingId)
  const { data: suggestions, isLoading, isError, error } = useQuery({
    queryKey: ['mapping-suggestions', ratingId, competitionId],
    queryFn: async () => {
      const result = await ratingRepository.getMappingSuggestions(ratingId, competitionId!)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    initialData: passedSuggestions,
    staleTime: passedSuggestions ? Infinity : undefined,
  })

  const [mapping, setMapping] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Инициализация во время рендера (не в эффекте) — тот же паттерн, что и в RatingFormPage.
  const [initializedFor, setInitializedFor] = useState<string | null>(null)
  if (suggestions && competitionId !== initializedFor) {
    setInitializedFor(competitionId!)
    const initial: Record<number, number> = {}
    for (const s of suggestions) initial[s.participantGroupId] = s.suggestedRatingGroupId ?? NO_MAPPING
    setMapping(initial)
  }

  const groupOptions: [number, string][] = [
    [NO_MAPPING, 'Нет соответствия'],
    ...((rating?.groups ?? []).map((g) => [g.id, g.title] as [number, string])),
  ]

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const entries = Object.entries(mapping)
      .filter(([, ratingGroupId]) => ratingGroupId !== NO_MAPPING)
      .map(([participantGroupId, ratingGroupId]) => ({ participantGroupId: Number(participantGroupId), ratingGroupId }))

    const result = await ratingRepository.setGroupMapping(ratingId, competitionId!, entries)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.ratingGroupMappingConfirmed(ratingId, competitionId!))
      await queryClient.invalidateQueries({ queryKey: ['rating-standings', ratingId] })
      navigate(`/ratings/${ratingId}`)
    } else {
      setSaveError('Не удалось сохранить маппинг')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Маппинг групп</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !suggestions || suggestions.length === 0 ? (
        <EmptyState text="В соревновании нет групп участников" />
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {suggestions.map((s) => (
            <div key={s.participantGroupId} className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
              <span className="text-fg">{s.participantGroupTitle}</span>
              <LabeledSelect
                label="Группа рейтинга"
                value={mapping[s.participantGroupId] ?? NO_MAPPING}
                options={groupOptions}
                onChange={(value) => setMapping({ ...mapping, [s.participantGroupId]: value })}
              />
            </div>
          ))}
          {saveError && <ErrorMessage message={saveError} />}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      )}
    </div>
  )
}
