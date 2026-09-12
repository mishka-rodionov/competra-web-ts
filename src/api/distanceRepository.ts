import { authRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { Distance } from '../types/distance'

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
}
