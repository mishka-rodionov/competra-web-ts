import { publicRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { PagedResponse } from './types'
import type { Competition, CompetitionDetail } from '../types/competition'

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
}
