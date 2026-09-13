import { useQuery } from '@tanstack/react-query'
import { diaryRepository } from '../../api/diaryRepository'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'

export function useWorkouts() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const result = await diaryRepository.getWorkouts()
      if (result.kind === 'error') throw new Error(result.message)
      return [...result.data].sort((a, b) => (b.startedAt ?? b.scheduledDate ?? 0) - (a.startedAt ?? a.scheduledDate ?? 0))
    },
    enabled: isLoggedIn,
  })
}

/** Бэкенд не отдаёт тренировку по id отдельно — как и в старом приложении, находим её в общем списке. */
export function useWorkout(id: number) {
  const query = useWorkouts()
  return { ...query, data: query.data?.find((w) => w.id === id) }
}
