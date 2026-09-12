import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { PagedResponse } from './types'
import type {
  ChangeRoleRequest,
  Club,
  ClubJoinRequest,
  ClubMember,
  CreateClubRequest,
  UpdateClubRequest,
} from '../types/club'

export const clubRepository = {
  searchClubs(query: string, page = 0, limit = 20) {
    const search = new URLSearchParams()
    if (query.trim()) search.set('query', query.trim())
    search.set('page', String(page))
    search.set('limit', String(limit))
    return safeApiCall(() => publicRequest<PagedResponse<Club>>(`/clubs?${search}`))
  },

  getClub(id: string) {
    return safeApiCall(() => publicRequest<Club>(`/clubs/${id}`))
  },

  getClubMembers(id: string) {
    return safeApiCall(() => publicRequest<ClubMember[]>(`/clubs/${id}/members`))
  },

  getMyClubs() {
    return safeApiCall(() => authRequest<Club[]>('/clubs/mine'))
  },

  createClub(request: CreateClubRequest) {
    return safeApiCall(() => authRequest<Club>('/clubs', { method: 'POST', body: JSON.stringify(request) }))
  },

  updateClub(id: string, request: UpdateClubRequest) {
    return safeApiCall(() => authRequest<Club>(`/clubs/${id}`, { method: 'PUT', body: JSON.stringify(request) }))
  },

  deleteClub(id: string) {
    return safeApiCallUnit(() => authRequest(`/clubs/${id}`, { method: 'DELETE' }))
  },

  /** requesterUserId == targetUserId — выход из клуба; иначе удаление участника (нужны права FOUNDER/ADMIN). */
  removeMember(clubId: string, targetUserId: string) {
    return safeApiCallUnit(() => authRequest(`/clubs/${clubId}/members/${targetUserId}`, { method: 'DELETE' }))
  },

  changeMemberRole(clubId: string, targetUserId: string, request: ChangeRoleRequest) {
    return safeApiCall(() =>
      authRequest<ClubMember>(`/clubs/${clubId}/members/${targetUserId}/role`, {
        method: 'PUT',
        body: JSON.stringify(request),
      }),
    )
  },

  createJoinRequest(clubId: string) {
    return safeApiCall(() => authRequest<ClubJoinRequest>(`/clubs/${clubId}/join-requests`, { method: 'POST' }))
  },

  getJoinRequestsForClub(clubId: string) {
    return safeApiCall(() => authRequest<ClubJoinRequest[]>(`/clubs/${clubId}/join-requests`))
  },

  getMyJoinRequests() {
    return safeApiCall(() => authRequest<ClubJoinRequest[]>('/clubs/join-requests/mine'))
  },

  reviewJoinRequest(clubId: string, requestId: string, approve: boolean) {
    return safeApiCall(() =>
      authRequest<ClubJoinRequest>(`/clubs/${clubId}/join-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ approve }),
      }),
    )
  },
}
