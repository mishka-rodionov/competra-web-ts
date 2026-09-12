import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { PagedResponse } from './types'
import type {
  Competition,
  CompetitionDetail,
  CreateCompetitionRequest,
  OrienteeringCompetition,
  RegisterEventRequest,
} from '../types/competition'

export interface GetPublicCompetitionsParams {
  kindOfSports?: string[]
  statuses?: string[]
  page?: number
  limit?: number
}

function buildQuery(params: GetPublicCompetitionsParams): string {
  const search = new URLSearchParams()
  params.kindOfSports?.forEach((v) => search.append('kind_of_sports', v))
  params.statuses?.forEach((v) => search.append('statuses', v))
  search.set('page', String(params.page ?? 0))
  search.set('limit', String(params.limit ?? 20))
  return search.toString()
}

export const competitionRepository = {
  getPublicCompetitions(params: GetPublicCompetitionsParams = {}) {
    return safeApiCall(() =>
      publicRequest<PagedResponse<Competition>>(`/event/orienteering/competitions/public?${buildQuery(params)}`),
    )
  },

  getCompetitionDetail(id: string) {
    return safeApiCall(() => publicRequest<CompetitionDetail>(`/event/orienteering/competitions/public/${id}`))
  },

  getMyCompetitions() {
    return safeApiCall(() => authRequest<OrienteeringCompetition[]>('/event/orienteering/competitions'))
  },

  getRegisteredCompetitions() {
    return safeApiCall(() => authRequest<OrienteeringCompetition[]>('/event/orienteering/competitions/registered'))
  },

  register(request: RegisterEventRequest) {
    return safeApiCallUnit(() =>
      authRequest('/event/orienteering/register', { method: 'POST', body: JSON.stringify(request) }),
    )
  },

  cancelRegistration(competitionId: string) {
    return safeApiCallUnit(() => authRequest(`/event/orienteering/register/${competitionId}`, { method: 'DELETE' }))
  },

  createCompetition(request: CreateCompetitionRequest) {
    return safeApiCall(() =>
      authRequest<OrienteeringCompetition>('/event/orienteering/save/competitions', {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    )
  },

  deleteCompetition(competitionId: string) {
    return safeApiCallUnit(() => authRequest(`/event/orienteering/competitions/${competitionId}`, { method: 'DELETE' }))
  },
}
