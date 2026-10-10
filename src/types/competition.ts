import type { TeamScoring, TeamScoringRequest } from './teamStandings'

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
  /** КВ соревнования в минутах — умолчание для групп без своего значения. */
  controlTimeMinutes: number | null
  /** IGNORE / DISQUALIFY / SCORE_PENALTY — что делать с превысившими КВ. */
  overtimePolicy: string
  /** SCORE / MIN_CONTROLS — итог формата «по выбору» (см. ranksByScore). Нет у старых ответов сервера. */
  byChoiceMode?: string
  /** Настройки командного зачёта; нет — зачёта нет. */
  teamScoring?: TeamScoring | null
  /** Режим проведённой жеребьёвки (GENERAL / GROUP / DISTANCE); null — не проводилась. Нет у старых ответов сервера. */
  drawMode?: string | null
  /** Коридоры жеребьёвки по дистанциям. */
  drawCorridors?: number | null
  /** Зазор жеребьёвки по дистанциям, в стартовых интервалах. */
  drawGap?: number | null
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
  /** Минимум КП дистанции группы («по выбору» с минимумом КП); null — все КП. Только в деталке соревнования. */
  distanceMinControlsCount?: number | null
  maxParticipants: number | null
  registeredCount: number
  /** Своё КВ группы в минутах (null — наследуется от соревнования). */
  timeLimitMinutes: number | null
  /**
   * Итоговое КВ группы с учётом наследования от соревнования. Приходит только из деталки
   * соревнования (/public/{id}); эндпоинт /participantGroups отдаёт группы без этих двух полей.
   */
  controlTimeMinutes?: number | null
  /** true, если controlTimeMinutes взято у соревнования, а не задано у группы. */
  controlTimeInherited?: boolean
  scorePenaltyPerMinute: number | null
  maxLatenessMinutes: number | null
  /** Своё N командного зачёта; null — как у соревнования. */
  teamCountedResults?: number | null
}

export interface RegisterEventRequest {
  competitionId: string
  groupId: number
  firstName: string
  lastName: string
  /** Подпись команды для протокола (свободный текст или выбор из подсказок). */
  commandName?: string | null
  /** Клубная команда пользователя — только если подпись совпадает с её подписью; сервер проверяет членство. */
  teamId?: string | null
}

/** Клубная команда (teamId != null) или клуб без команды пользователя с готовой подписью для протокола. */
export interface RegistrationTeamOption {
  teamId: string | null
  clubId: string
  clubName: string
  teamName: string | null
  /** «Клуб (Команда)» или название клуба. */
  label: string
}

/** Ответ `GET /event/orienteering/competitions/{id}/registration-team-options`. */
export interface RegistrationTeamOptions {
  options: RegistrationTeamOption[]
  /** Подписи команд, уже встречающиеся в протоколе соревнования. */
  protocolNames: string[]
  /** Что подставить в поле сразу; null — оставить пустым. */
  suggestedCommandName: string | null
}

export interface CompetitionFields {
  title: string
  startDate: number
  endDate: number | null
  kindOfSport: string
  description: string | null
  address: string | null
  coordinates: Coordinates | null
  status: string
  registrationStart: number | null
  registrationEnd: number | null
  maxParticipants: number | null
  feeAmount: number | null
  feeCurrency: string | null
  mainOrganizerId: string | null
  organizerName: string | null
  contactPhone: string | null
  contactEmail: string | null
  website: string | null
  regulationUrl: string | null
  mapUrl: string | null
  imageUrl?: string | null
  resultsStatus: string
  timeZoneId: string
  isTest: boolean
}

export interface CreateCompetitionRequest {
  competitionId: string
  competition: CompetitionFields
  direction: string
  punchingSystem: string
  startTimeMode: string
  startIntervalSeconds: number | null
  controlTimeMinutes: number | null
  overtimePolicy: string
  /** SCORE / MIN_CONTROLS — итог формата «по выбору»; для остальных направлений не используется. */
  byChoiceMode: string
  /** Командный зачёт: не передан — не менять, enabled = false — выключить. */
  teamScoring?: TeamScoringRequest
  countdownTimer?: number | null
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
  controlTimeMinutes: number | null
  overtimePolicy: string
  /** SCORE / MIN_CONTROLS — итог формата «по выбору». Нет у старых ответов сервера. */
  byChoiceMode?: string
  /** Настройки командного зачёта; нет — зачёта нет. */
  teamScoring?: TeamScoring | null
}
