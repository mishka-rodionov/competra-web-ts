import { authRequest, publicRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'
import type { PagedResponse } from './types'
import type {
  AddCompetitionToRatingResult,
  CreateRatingRequest,
  GroupMappingEntry,
  Rating,
  RatingCompetition,
  RatingGroupMappingSuggestion,
  RatingStandingsResponse,
  RatingSummary,
  UpdateRatingRequest,
} from '../types/rating'

export const ratingRepository = {
  searchRatings(query: string, page = 0, limit = 20) {
    const search = new URLSearchParams()
    if (query.trim()) search.set('query', query.trim())
    search.set('page', String(page))
    search.set('limit', String(limit))
    return safeApiCall(() => publicRequest<PagedResponse<RatingSummary>>(`/ratings?${search}`))
  },

  getRatingsForClub(clubId: string) {
    return safeApiCall(() => publicRequest<Rating[]>(`/clubs/${clubId}/ratings`))
  },

  getRating(id: string) {
    return safeApiCall(() => publicRequest<Rating>(`/ratings/${id}`))
  },

  createRating(clubId: string, request: CreateRatingRequest) {
    return safeApiCall(() => authRequest<Rating>(`/clubs/${clubId}/ratings`, { method: 'POST', body: JSON.stringify(request) }))
  },

  updateRating(id: string, request: UpdateRatingRequest) {
    return safeApiCall(() => authRequest<Rating>(`/ratings/${id}`, { method: 'PUT', body: JSON.stringify(request) }))
  },

  deleteRating(id: string) {
    return safeApiCallUnit(() => authRequest(`/ratings/${id}`, { method: 'DELETE' }))
  },

  getRatingCompetitions(id: string) {
    return safeApiCall(() => publicRequest<RatingCompetition[]>(`/ratings/${id}/competitions`))
  },

  addCompetition(id: string, competitionId: string) {
    return safeApiCall(() =>
      authRequest<AddCompetitionToRatingResult>(`/ratings/${id}/competitions`, {
        method: 'POST',
        body: JSON.stringify({ competitionId }),
      }),
    )
  },

  removeCompetition(id: string, competitionId: string) {
    return safeApiCallUnit(() => authRequest(`/ratings/${id}/competitions/${competitionId}`, { method: 'DELETE' }))
  },

  getMappingSuggestions(id: string, competitionId: string) {
    return safeApiCall(() =>
      publicRequest<RatingGroupMappingSuggestion[]>(`/ratings/${id}/competitions/${competitionId}/mapping-suggestions`),
    )
  },

  setGroupMapping(id: string, competitionId: string, mappings: GroupMappingEntry[]) {
    return safeApiCallUnit(() =>
      authRequest(`/ratings/${id}/competitions/${competitionId}/mapping`, {
        method: 'PUT',
        body: JSON.stringify({ mappings }),
      }),
    )
  },

  getStandings(id: string, groupId: number) {
    return safeApiCall(() =>
      publicRequest<RatingStandingsResponse>(`/ratings/${id}/standings?${new URLSearchParams({ groupId: String(groupId) })}`),
    )
  },
}
