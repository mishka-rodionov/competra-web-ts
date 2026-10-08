import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { OrienteeringParticipant, OrienteeringResult, SaveParticipantRequest, SaveResultRequest } from '../types/participant'
import type { TeamStandings } from '../types/teamStandings'

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
      publicRequest<OrienteeringParticipant[]>(
        `/event/orienteering/participants/competition?${new URLSearchParams({ competitionId })}`,
      ),
    )
  },

  saveParticipant(request: SaveParticipantRequest) {
    return safeApiCall(() =>
      authRequest<OrienteeringParticipant>('/event/orienteering/save/participant', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    )
  },

  deleteParticipant(id: string) {
    return safeApiCallUnit(() => authRequest(`/event/orienteering/participants/${id}`, { method: 'DELETE' }))
  },

  /** Сохраняет список участников одним запросом. */
  saveParticipants(requests: SaveParticipantRequest[]) {
    return safeApiCall(() =>
      authRequest<OrienteeringParticipant[]>('/event/orienteering/save/participants', {
        method: 'POST',
        body: JSON.stringify(requests),
      }),
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
