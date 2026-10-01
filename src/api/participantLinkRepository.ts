import { authRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type {
  CompetitionLinkRequest,
  LinkRequest,
  LinkRequestSource,
  LinkSuggestion,
} from '../types/participantLink'

export const participantLinkRepository = {
  getSuggestions() {
    return safeApiCall(() => authRequest<LinkSuggestion[]>('/event/orienteering/link-requests/suggestions'))
  },

  createRequests(participantIds: string[], source: LinkRequestSource) {
    return safeApiCall(() =>
      authRequest<LinkRequest[]>('/event/orienteering/link-requests', {
        method: 'POST',
        body: JSON.stringify({ participantIds, source }),
      }),
    )
  },

  getMyRequests() {
    return safeApiCall(() => authRequest<LinkRequest[]>('/event/orienteering/link-requests/mine'))
  },

  cancelRequest(requestId: string) {
    return safeApiCallUnit(() => authRequest(`/event/orienteering/link-requests/${requestId}`, { method: 'DELETE' }))
  },

  getCompetitionRequests(competitionId: string) {
    return safeApiCall(() =>
      authRequest<CompetitionLinkRequest[]>(
        `/event/orienteering/link-requests/competition?${new URLSearchParams({ competitionId })}`,
      ),
    )
  },

  /** competitionId → число заявок на рассмотрении, по соревнованиям, где пользователь управляет участниками. */
  getPendingCounts() {
    return safeApiCall(() => authRequest<Record<string, number>>('/event/orienteering/link-requests/pending-counts'))
  },

  reviewRequest(requestId: string, approve: boolean, comment: string | null) {
    return safeApiCall(() =>
      authRequest<LinkRequest>(`/event/orienteering/link-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ approve, comment }),
      }),
    )
  },

  unlinkParticipant(participantId: string) {
    return safeApiCallUnit(() =>
      authRequest(`/event/orienteering/participants/${participantId}/unlink`, { method: 'POST' }),
    )
  },
}
