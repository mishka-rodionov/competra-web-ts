import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TrackMapView } from '../components/TrackMapView'
import { useWorkout } from '../features/diary/hooks'
import { formatDistanceKm } from '../features/diary/labels'
import { formatTime } from '../lib/dateUtils'
import { TrackCodec } from '../lib/trackCodec'

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
        <div className="flex flex-1 flex-col gap-3 p-4">
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
          <div className="flex min-h-80 flex-1 overflow-hidden rounded-lg border border-outline-variant">
            <TrackMapView points={points} />
          </div>
        </div>
      )}
    </div>
  )
}
