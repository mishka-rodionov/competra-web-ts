import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { OrienteeringParticipant, OrienteeringResult, SaveParticipantRequest, SaveResultRequest } from '../types/participant'
import type { TeamStandings } from '../types/teamStandings'
import type { CommonModel } from './types'

/** Участник в ответе сервера: startNumber приходит числом, 0 — «номер не назначен» (самостоятельная регистрация, добавление до жеребьёвки). */
type ParticipantResponse = Omit<OrienteeringParticipant, 'startNumber'> & { startNumber: number | string | null }

/** Приводит startNumber к строке, а неназначенный (0) — к null, чтобы он показывался как «—», а не «0». */
function toParticipant(p: ParticipantResponse): OrienteeringParticipant {
  return { ...p, startNumber: p.startNumber != null && Number(p.startNumber) > 0 ? String(p.startNumber) : null }
}

function toParticipants(response: CommonModel<ParticipantResponse[]>): CommonModel<OrienteeringParticipant[]> {
  return { ...response, result: response.result?.map(toParticipant) ?? null }
}

export const resultRepository = {
  /** Командный зачёт — вычисляется сервером из результатов; запрашивать, только если он включён (иначе result = null). */
  getTeamStandings(competitionId: string) {
    return safeApiCall(() =>
      publicRequest<TeamStandings>(`/event/orienteering/competitions/${encodeURIComponent(competitionId)}/team-standings`),
    )
  },

  getResults(competitionId: string) {
    return safeApiCall(() =>
      publicRequest<OrienteeringResult[]>(
        `/event/orienteering/results/competition?${new URLSearchParams({ competitionId })}`,
      ),
    )
  },

  getParticipants(competitionId: string) {
    return safeApiCall(() =>
      publicRequest<ParticipantResponse[]>(
        `/event/orienteering/participants/competition?${new URLSearchParams({ competitionId })}`,
      ).then(toParticipants),
    )
  },

  saveParticipant(request: SaveParticipantRequest) {
    return safeApiCall(() =>
      authRequest<ParticipantResponse>('/event/orienteering/save/participant', {
        method: 'POST',
        body: JSON.stringify(request),
      }).then((response) => ({ ...response, result: response.result && toParticipant(response.result) })),
    )
  },

  deleteParticipant(id: string) {
    return safeApiCallUnit(() => authRequest(`/event/orienteering/participants/${id}`, { method: 'DELETE' }))
  },

  /** Сохраняет список участников одним запросом. */
  saveParticipants(requests: SaveParticipantRequest[]) {
    return safeApiCall(() =>
      authRequest<ParticipantResponse[]>('/event/orienteering/save/participants', {
        method: 'POST',
        body: JSON.stringify(requests),
      }).then(toParticipants),
    )
  },

  saveResults(requests: SaveResultRequest[]) {
    return safeApiCall(() =>
      authRequest<OrienteeringResult[]>('/event/orienteering/save/results', {
        method: 'POST',
        body: JSON.stringify(requests),
      }),
    )
  },
}
