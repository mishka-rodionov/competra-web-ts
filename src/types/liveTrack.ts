/** Статус сессии онлайн-трека на сервере. */
export type LiveTrackStatus = 'ACTIVE' | 'FINISHED' | 'STOPPED' | 'TIMED_OUT'

/** Дистанция соревнования, по которой есть онлайн-треки. */
export interface TrackedDistance {
  distanceId: number
  name: string | null
  activeCount: number
  totalCount: number
}

/** Сессия в ответе `live`: точки — `[t, lat, lon]`, только новые после курсора. */
export interface LiveSessionDto {
  sessionId: string
  participantId: string
  displayName: string
  groupName: string | null
  startNumber: number | null
  status: LiveTrackStatus
  closeReason: string | null
  startedAt: number
  lastPointAt: number | null
  points: [number, number, number][]
}

/** Ответ `live`. `reset` — курсор не узнан (сервер перезапущен): точки в ответе полные. */
export interface LiveSnapshot {
  cursor: string
  reset: boolean
  serverTime: number
  sessions: LiveSessionDto[]
}

/** Трек из архива `tracks`: `trackEncoded` — формат TrackCodec от `startedAt`. */
export interface ArchivedTrackDto {
  sessionId: string
  participantId: string
  displayName: string
  groupName: string | null
  startNumber: number | null
  status: LiveTrackStatus
  closeReason: string | null
  startedAt: number
  closedAt: number | null
  trackEncoded: string
}
