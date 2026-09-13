import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { useWorkout } from '../features/diary/hooks'
import { formatDistanceKm } from '../features/diary/labels'
import { formatTime } from '../lib/dateUtils'
import { TrackCodec } from '../lib/trackCodec'

/**
 * Рендер трека на карте (TrackMapView в старом приложении) отложен — та же задача,
 * что и интерактивная карта дистанции в вертикали 1 (нужно сначала выбрать библиотеку
 * карт). Пока показываем сводку по треку и число точек.
 */
export function WorkoutTrackPage() {
  const { id } = useParams<{ id: string }>()
  const workoutId = Number(id)
  const navigate = useNavigate()
  const { data: workout, isLoading, isError, error } = useWorkout(workoutId)

  const startedAtMs = workout?.startedAt ?? workout?.scheduledDate ?? 0
  const points = workout ? TrackCodec.decode(startedAtMs, workout.trackEncoded) : []

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Трек тренировки</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !workout ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Тренировка не найдена'} />
      ) : (
        <div className="flex flex-col gap-3 p-4">
          <div className="rounded-lg border border-outline-variant bg-surface p-4">
            <p className="text-base text-fg">
              {[
                workout.distanceMeters != null ? formatDistanceKm(workout.distanceMeters) : null,
                workout.durationSeconds != null ? formatTime(workout.durationSeconds) : null,
                workout.elevationGainMeters != null ? `+${workout.elevationGainMeters} м` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Нет данных'}
            </p>
          </div>
          <p className="text-sm text-on-surface-variant">
            Трек: {points.length} {points.length === 1 ? 'точка' : 'точек'} GPS. Отображение на карте появится позже.
          </p>
        </div>
      )}
    </div>
  )
}
