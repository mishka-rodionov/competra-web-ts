import { authRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { ParticipantGroupDetail } from '../types/competition'
import type { CreateGroupRequest } from '../types/group'

export const groupRepository = {
  getGroups(competitionId: string) {
    return safeApiCall(() =>
      authRequest<ParticipantGroupDetail[]>(`/event/orienteering/participantGroups?${new URLSearchParams({ competitionId })}`),
    )
  },

  /** Сохраняет список групп одним запросом. */
  saveGroups(requests: CreateGroupRequest[]) {
    return safeApiCall(() =>
      authRequest<ParticipantGroupDetail[]>('/event/orienteering/save/participantGroup', {
        method: 'POST',
        body: JSON.stringify(requests),
      }),
    )
  },

  deleteGroup(groupId: number) {
    return safeApiCallUnit(() => authRequest(`/event/orienteering/participantGroups/${groupId}`, { method: 'DELETE' }))
  },
}
