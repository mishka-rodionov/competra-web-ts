import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { OrienteeringParticipant, OrienteeringResult, SaveParticipantRequest } from '../types/participant'

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
}
