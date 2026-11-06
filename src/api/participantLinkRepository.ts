import { authRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type {
  CompetitionLinkRequest,
  LinkRequest,
  LinkCandidate,
  LinkRequestSource,
  LinkSuggestion,
  OrganizerLinkResult,
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

  /** Аккаунты для привязки участника организатором; без query — по фамилии участника. */
  getLinkCandidates(participantId: string, query: string) {
    const params = query.trim() ? `?${new URLSearchParams({ query: query.trim() })}` : ''
    return safeApiCall(() =>
      authRequest<LinkCandidate[]>(`/event/orienteering/participants/${participantId}/link-candidates${params}`),
    )
  },

  /** Организатор сам привязывает участников к аккаунту — без заявки пользователя. */
  linkParticipants(userId: string, participantIds: string[]) {
    return safeApiCall(() =>
      authRequest<OrganizerLinkResult>('/event/orienteering/participants/link', {
        method: 'POST',
        body: JSON.stringify({ userId, participantIds }),
      }),
    )
  },
}
