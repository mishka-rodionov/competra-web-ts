import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type {
  AddTeamMemberRequest,
  ChangeTeamMemberRoleRequest,
  CreateTeamRequest,
  Team,
  TeamMember,
  UpdateTeamRequest,
} from '../types/team'

export const teamRepository = {
  getTeamsByClub(clubId: string) {
    return safeApiCall(() => publicRequest<Team[]>(`/clubs/${clubId}/teams`))
  },

  getTeam(id: string) {
    return safeApiCall(() => publicRequest<Team>(`/teams/${id}`))
  },

  getTeamMembers(id: string) {
    return safeApiCall(() => publicRequest<TeamMember[]>(`/teams/${id}/members`))
  },

  createTeam(clubId: string, request: CreateTeamRequest) {
    return safeApiCall(() => authRequest<Team>(`/clubs/${clubId}/teams`, { method: 'POST', body: JSON.stringify(request) }))
  },

  updateTeam(id: string, request: UpdateTeamRequest) {
    return safeApiCall(() => authRequest<Team>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(request) }))
  },

  deleteTeam(id: string) {
    return safeApiCallUnit(() => authRequest(`/teams/${id}`, { method: 'DELETE' }))
  },

  addTeamMember(teamId: string, request: AddTeamMemberRequest) {
    return safeApiCall(() =>
      authRequest<TeamMember>(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(request) }),
    )
  },

  removeTeamMember(teamId: string, clubMemberId: string) {
    return safeApiCallUnit(() => authRequest(`/teams/${teamId}/members/${clubMemberId}`, { method: 'DELETE' }))
  },

  changeTeamMemberRole(teamId: string, clubMemberId: string, request: ChangeTeamMemberRoleRequest) {
    return safeApiCall(() =>
      authRequest<TeamMember>(`/teams/${teamId}/members/${clubMemberId}/role`, {
        method: 'PUT',
        body: JSON.stringify(request),
      }),
    )
  },
}
