import { authRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { Workout, WorkoutRequest } from '../types/workout'

export const diaryRepository = {
  getWorkouts() {
    return safeApiCall(() => authRequest<Workout[]>('/diary/workouts'))
  },

  saveWorkout(request: WorkoutRequest) {
    return safeApiCall(() =>
      authRequest<Workout[]>('/diary/workouts', { method: 'POST', body: JSON.stringify([request]) }),
    )
  },

  deleteWorkout(id: number) {
    return safeApiCallUnit(() => authRequest(`/diary/workouts/${id}`, { method: 'DELETE' }))
  },
}
