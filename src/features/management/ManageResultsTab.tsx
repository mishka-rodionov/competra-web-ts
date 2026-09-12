import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { competitionRepository } from '../../api/competitionRepository'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import type { OrienteeringCompetition } from '../../types/competition'
import { useResults } from '../competition-detail/hooks'
import { competitionToFields } from './types'

/** Импорт из Excel/HTML и ручное редактирование результатов — отдельная часть переноса, пока не сделана. */
export function ManageResultsTab({ competition }: { competition: OrienteeringCompetition }) {
  const queryClient = useQueryClient()
  const competitionId = competition.competitionId
  const { data: results, isLoading, isError, error } = useResults(competitionId, competition.competition.status)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const resultsStatus = competition.competition.resultsStatus

  async function handlePublish() {
    setPublishing(true)
    setPublishError(null)
    const result = await competitionRepository.createCompetition({
      competitionId,
      competition: competitionToFields(competition.competition, { resultsStatus: 'OFFICIAL' }),
      direction: competition.direction,
      punchingSystem: competition.punchingSystem,
      startTimeMode: competition.startTimeMode,
      startIntervalSeconds: competition.startIntervalSeconds,
    })
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['managed-competition', competitionId] })
      setShowPublishConfirm(false)
    } else {
      setPublishError(result.message)
    }
    setPublishing(false)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-base font-medium text-fg">Результаты</h2>
      <p className="text-sm text-on-surface-variant">
        Импорт из Excel/HTML и ручное редактирование результатов — в следующей части переноса. Здесь пока просмотр и
        публикация уже загруженных результатов.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface-variant">
          {resultsStatus === 'OFFICIAL' ? 'Статус: результаты официальные' : 'Статус: результаты не опубликованы'}
        </span>
        {resultsStatus !== 'OFFICIAL' && (
          <button
            type="button"
            disabled={isLoading || !results || results.length === 0}
            onClick={() => setShowPublishConfirm(true)}
            className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50"
          >
            Опубликовать результаты
          </button>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !results || results.length === 0 ? (
        <EmptyState text="Результаты ещё не опубликованы." />
      ) : (
        <p className="text-base text-fg">
          Всего результатов: {results.length} (финишировали: {results.filter((r) => r.status === 'FINISHED').length})
        </p>
      )}

      {showPublishConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Опубликовать результаты?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Результаты станут официальными и видимыми участникам. Это действие необратимо.
            </p>
            {publishError && <ErrorMessage message={publishError} />}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={publishing}
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
              >
                {publishing ? 'Публикация…' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
