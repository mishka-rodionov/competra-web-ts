import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { OrienteeringParticipant, OrienteeringResult, SaveParticipantRequest, SaveResultRequest } from '../types/participant'

export const resultRepository = {
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
