import { publicRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { OrienteeringParticipant, OrienteeringResult } from '../types/participant'

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
}
