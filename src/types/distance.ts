export interface ControlPoint {
  number: number
  role: string
  score: number
  latitude: number | null
  longitude: number | null
}

export interface Distance {
  id: number
  competitionId: string
  name: string | null
  lengthMeters: number
  climbMeters: number
  controlsCount: number
  description: string | null
  controlPoints: ControlPoint[]
  finishControlPoint: number | null
  /** Номер КП стартовой станции — задаётся только при режиме старта BY_START_STATION. */
  startControlPoint: number | null
  mapUrl: string | null
  mapTopLeftLat: number | null
  mapTopLeftLng: number | null
  mapBottomRightLat: number | null
  mapBottomRightLng: number | null
  updatedAt: number
}

export interface SaveDistanceRequest {
  distanceId: number | null
  competitionId: string
  name: string | null
  lengthMeters: number
  climbMeters: number
  controlsCount: number
  description: string
  controlPoints: ControlPoint[]
  finishControlPoint: number | null
  startControlPoint?: number | null
  mapUrl?: string | null
  mapTopLeftLat?: number | null
  mapTopLeftLng?: number | null
  mapBottomRightLat?: number | null
  mapBottomRightLng?: number | null
}
