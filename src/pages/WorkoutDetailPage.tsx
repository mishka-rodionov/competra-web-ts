import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { diaryRepository } from '../api/diaryRepository'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { formatDistanceKm, skiStyleLabel, sportTypeLabel } from '../features/diary/labels'
import { useWorkout } from '../features/diary/hooks'
import { formatTime, toLocaleDateString } from '../lib/dateUtils'

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const workoutId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: workout, isLoading, isError, error } = useWorkout(workoutId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    const result = await diaryRepository.deleteWorkout(workoutId)
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] })
      navigate('/diary')
    } else {
      setDeleteError('Не удалось удалить тренировку')
      setShowDeleteConfirm(false)
    }
  }

  const isPlanned = workout?.status === 'PLANNED'
  const dateMillis = workout?.startedAt ?? workout?.scheduledDate

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate('/diary')} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">{workout ? sportTypeLabel(workout.sportType) : 'Тренировка'}</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !workout ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Тренировка не найдена'} />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          <DetailRow label={isPlanned ? 'Запланирована на' : 'Дата'} value={dateMillis != null ? toLocaleDateString(dateMillis) : '—'} />

          {!isPlanned && (
            <>
              {workout.durationSeconds != null && <DetailRow label="Длительность" value={formatTime(workout.durationSeconds)} />}
              {workout.distanceMeters != null && <DetailRow label="Дистанция" value={formatDistanceKm(workout.distanceMeters)} />}
              {workout.elevationGainMeters != null && <DetailRow label="Набор высоты" value={`${workout.elevationGainMeters} м`} />}
              {workout.runDetails?.cadenceSpm != null && <DetailRow label="Каденс" value={`${workout.runDetails.cadenceSpm} шаг/мин`} />}
              {workout.bikeDetails?.cadenceRpm != null && <DetailRow label="Каденс" value={`${workout.bikeDetails.cadenceRpm} об/мин`} />}
              {workout.bikeDetails?.powerWatts != null && <DetailRow label="Мощность" value={`${workout.bikeDetails.powerWatts} Вт`} />}
              {workout.skiDetails?.style && <DetailRow label="Стиль" value={skiStyleLabel(workout.skiDetails.style)} />}
            </>
          )}

          {workout.notes?.trim() && (
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Заметка</span>
              <p className="text-base text-fg">{workout.notes}</p>
            </div>
          )}

          {deleteError && <ErrorMessage message={deleteError} />}

          <div className="mt-2 flex flex-wrap gap-2">
            {workout.trackEncoded && (
              <button type="button" onClick={() => navigate(`/diary/${workout.id}/track`)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
                Посмотреть трек
              </button>
            )}
            <button type="button" onClick={() => navigate(`/diary/${workout.id}/edit`)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
              Редактировать
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-error">
              Удалить
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить тренировку?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">Действие необратимо.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-on-surface-variant">{label}</span>
      <span className="text-base text-fg">{value}</span>
    </div>
  )
}
