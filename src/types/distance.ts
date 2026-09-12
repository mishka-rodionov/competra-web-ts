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
  mapUrl: string | null
  mapTopLeftLat: number | null
  mapTopLeftLng: number | null
  mapBottomRightLat: number | null
  mapBottomRightLng: number | null
  updatedAt: number
}
