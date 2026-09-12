import { authRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { Distance, SaveDistanceRequest } from '../types/distance'

/**
 * Ходит через authRequest, как и в старом репозитории (DistanceRepository там завязан на
 * authClient целиком, хотя используется и в публичном просмотре) — эндпоинт при этом не требует
 * токена, анонимный запрос просто уходит без заголовка Authorization.
 */
export const distanceRepository = {
  getByCompetition(competitionId: string) {
    return safeApiCall(() =>
      authRequest<Distance[]>(`/event/orienteering/distances?${new URLSearchParams({ competitionId })}`),
    )
  },

  /** Сохраняет список дистанций одним запросом (бэкенд возвращает их в том же порядке). */
  saveDistances(requests: SaveDistanceRequest[]) {
    return safeApiCall(() =>
      authRequest<Distance[]>('/event/orienteering/save/distances', {
        method: 'POST',
        body: JSON.stringify(requests),
      }),
    )
  },

  /** Импорт дистанций из IOF XML (Mapper) — сервер сам парсит файл и возвращает реальные id. */
  importFromXml(competitionId: string, xmlText: string) {
    const formData = new FormData()
    formData.append('competitionId', competitionId)
    formData.append('xmlFile', new Blob([xmlText], { type: 'application/xml' }), 'courses.xml')
    return safeApiCall(() =>
      authRequest<Distance[]>('/event/orienteering/import/courses', { method: 'POST', body: formData }),
    )
  },
}
