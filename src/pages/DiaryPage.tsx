import { useNavigate } from 'react-router-dom'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { LoginForm } from '../features/auth/LoginForm'
import { formatDistanceKm, formatWorkoutDuration, sportTypeLabel } from '../features/diary/labels'
import { useWorkouts } from '../features/diary/hooks'
import { toLocaleDateString } from '../lib/dateUtils'
import type { Workout } from '../types/workout'

export function DiaryPage() {
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()
  const { data: workouts, isLoading, isError, error } = useWorkouts()

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={() => {}} onPrivacyClick={() => navigate('/privacy')} />
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h1 className="text-lg font-medium text-fg">Тренировочный дневник</h1>
        <button type="button" onClick={() => navigate('/diary/create')} className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary">
          + Добавить вручную
        </button>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !workouts || workouts.length === 0 ? (
        <EmptyState text="Тренировок пока нет" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} onClick={() => navigate(`/diary/${workout.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ workout, onClick }: { workout: Workout; onClick: () => void }) {
  const dateMillis = workout.startedAt ?? workout.scheduledDate
  const parts =
    workout.status === 'COMPLETED'
      ? [
          workout.distanceMeters != null ? formatDistanceKm(workout.distanceMeters) : null,
          workout.durationSeconds != null ? formatWorkoutDuration(workout.durationSeconds) : null,
        ].filter((v): v is string => v != null)
      : []

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-fg">{sportTypeLabel(workout.sportType)}</span>
        {workout.status === 'PLANNED' && <span className="text-xs font-medium text-primary">Запланировано</span>}
      </div>
      {dateMillis != null && <span className="text-sm text-on-surface-variant">{toLocaleDateString(dateMillis)}</span>}
      {parts.length > 0 && <span className="text-sm text-on-surface-variant">{parts.join(' · ')}</span>}
    </button>
  )
}
