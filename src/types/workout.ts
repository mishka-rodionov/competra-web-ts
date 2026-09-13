export interface RunDetails {
  cadenceSpm: number | null
}

export interface BikeDetails {
  cadenceRpm: number | null
  powerWatts: number | null
}

/** style: "CLASSIC" | "SKATE" */
export interface SkiDetails {
  style: string | null
}

/** sportType: "RUNNING" | "CYCLING" | "SKIING". status: "PLANNED" | "COMPLETED" (веб не использует IN_PROGRESS). */
export interface Workout {
  id: number
  sportType: string
  status: string
  scheduledDate: number | null
  startedAt: number | null
  durationSeconds: number | null
  distanceMeters: number | null
  elevationGainMeters: number | null
  notes: string | null
  trackEncoded: string | null
  runDetails: RunDetails | null
  bikeDetails: BikeDetails | null
  skiDetails: SkiDetails | null
  updatedAt: number
}

export interface WorkoutRequest {
  workoutId: number | null
  sportType: string
  status: string
  scheduledDate: number | null
  startedAt: number | null
  durationSeconds: number | null
  distanceMeters: number | null
  elevationGainMeters: number | null
  notes: string | null
  trackEncoded: string | null
  runDetails: RunDetails | null
  bikeDetails: BikeDetails | null
  skiDetails: SkiDetails | null
}
