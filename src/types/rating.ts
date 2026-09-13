export interface RatingGroup {
  id: number
  ratingId: string
  title: string
  /** "MALE" | "FEMALE" | "MIXED" | null (любой). */
  gender: string | null
  minAge: number | null
  maxAge: number | null
  orderIndex: number
}

export interface Rating {
  id: string
  name: string
  ownerClubId: string
  groups: RatingGroup[]
  createdAt: number
  updatedAt: number
}

/** Облегчённая карточка рейтинга для глобального поиска. */
export interface RatingSummary {
  id: string
  name: string
  ownerClubId: string
  ownerClubName: string
  createdAt: number
}

export interface RatingCompetition {
  id: string
  ratingId: string
  competitionId: string
  competitionTitle: string
  competitionStartDate: number
  addedAt: number
}

export interface RatingGroupMappingSuggestion {
  participantGroupId: number
  participantGroupTitle: string
  suggestedRatingGroupId: number | null
  confidence: number
}

export interface AddCompetitionToRatingResult {
  ratingCompetition: RatingCompetition
  groupMappingSuggestions: RatingGroupMappingSuggestion[]
}

export interface RatingStandingBreakdownEntry {
  competitionId: string
  place: number | null
  points: number
}

export interface RatingStanding {
  participantKey: string
  displayName: string
  totalPoints: number
  rank: number
  breakdown: RatingStandingBreakdownEntry[]
}

export interface RatingStandingsResponse {
  ratingGroupId: number
  standings: RatingStanding[]
}

export interface RatingGroupRequest {
  id: number | null
  title: string
  gender: string | null
  minAge: number | null
  maxAge: number | null
  orderIndex: number
}

export interface CreateRatingRequest {
  name: string
  groups: RatingGroupRequest[]
}

export interface UpdateRatingRequest {
  name: string
  groups: RatingGroupRequest[]
}

export interface GroupMappingEntry {
  participantGroupId: number
  ratingGroupId: number
}
