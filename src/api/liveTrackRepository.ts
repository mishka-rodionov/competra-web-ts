import { publicRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { ArchivedTrackDto, LiveSnapshot, TrackedDistance } from '../types/liveTrack'

/**
 * Публичные эндпоинты онлайн-треков для зрителей (`/api/live-track`, отдельный процесс трекинга
 * на бэкенде — его сбой не затрагивает остальной API). Авторизация не нужна.
 */
export const liveTrackRepository = {
  /** Дистанции соревнования, по которым есть треки. */
  getDistances(competitionId: string) {
    return safeApiCall(() => publicRequest<TrackedDistance[]>(`/live-track/competitions/${encodeURIComponent(competitionId)}/distances`))
  },

  /** Живой снимок дистанции: новые точки после курсора (без курсора — с начала). */
  getLive(distanceId: number, cursor: string | null) {
    const query = cursor ? `?${new URLSearchParams({ since: cursor })}` : ''
    return safeApiCall(() => publicRequest<LiveSnapshot>(`/live-track/distances/${distanceId}/live${query}`))
  },

  /** Архив треков дистанции (полные треки, в т.ч. давно закрытые). */
  getTracks(distanceId: number) {
    return safeApiCall(() => publicRequest<ArchivedTrackDto[]>(`/live-track/distances/${distanceId}/tracks`))
  },
}
