export interface Coordinates {
  latitude: number
  longitude: number
}

/** Плоская модель от /public — не путать с CompetitionDetail и OrienteeringCompetition. */
export interface Competition {
  id: string
  legacyId: number | null
  title: string
  startDate: number
  endDate: number | null
  kindOfSport: string
  description: string | null
  address: string | null
  coordinates: Coordinates | null
  status: string
  imageUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  maxParticipants: number | null
  feeAmount: number | null
  feeCurrency: string | null
  timeZoneId: string
  registrationStart: number | null
  registrationEnd: number | null
  mainOrganizerId: string | null
  organizerName: string | null
  website: string | null
  regulationUrl: string | null
  mapUrl: string | null
  resultsStatus: string
  isTest: boolean
}

/** Авторизованные эндпоинты возвращают это — competitionId + вложенный Competition. */
export interface OrienteeringCompetition {
  competitionId: string
  competition: Competition
  direction: string
  punchingSystem: string
  startTimeMode: string
  isDrawConducted: boolean
  startTime: number | null
  startIntervalSeconds: number | null
  countdownTimer: number | null
}

export interface ParticipantGroupDetail {
  groupId: number
  title: string
  gender: string | null
  minAge: number | null
  maxAge: number | null
  distanceId: number | null
  distanceName: string | null
  distanceLengthMeters: number | null
  distanceClimbMeters: number | null
  distanceControlsCount: number | null
  distanceDescription: string | null
  maxParticipants: number | null
  registeredCount: number
  timeLimitMinutes: number | null
  scorePenaltyPerMinute: number | null
  maxLatenessMinutes: number | null
}

export interface RegisterEventRequest {
  competitionId: string
  groupId: number
  firstName: string
  lastName: string
}

export interface CompetitionDetail {
  id: string
  legacyId: number | null
  title: string
  startDate: number
  endDate: number | null
  kindOfSport: string
  description: string | null
  address: string | null
  coordinates: Coordinates | null
  status: string
  imageUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  maxParticipants: number | null
  feeAmount: number | null
  feeCurrency: string | null
  timeZoneId: string
  registrationStart: number | null
  registrationEnd: number | null
  resultsStatus: string
  mainOrganizerId: string | null
  organizingClubId: string | null
  organizerFirstName: string | null
  organizerLastName: string | null
  organizerMiddleName: string | null
  organizerName: string | null
  startTime: number | null
  website: string | null
  regulationUrl: string | null
  mapUrl: string | null
  resultsUrl: string | null
  participantGroups: ParticipantGroupDetail[]
  isUserRegistered: boolean
  isTest: boolean
  direction: string
}
