import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ratingRepository } from '../../api/ratingRepository'

const RATINGS_PAGE_SIZE = 20

export function useSearchRatings(query: string) {
  return useInfiniteQuery({
    queryKey: ['ratings-search', query],
    queryFn: async ({ pageParam }) => {
      const result = await ratingRepository.searchRatings(query, pageParam, RATINGS_PAGE_SIZE)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  })
}

export function useRatingsForClub(clubId: string) {
  return useQuery({
    queryKey: ['ratings-for-club', clubId],
    queryFn: async () => {
      const result = await ratingRepository.getRatingsForClub(clubId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    enabled: clubId !== '',
  })
}

export function useRating(id: string) {
  return useQuery({
    queryKey: ['rating', id],
    queryFn: async () => {
      const result = await ratingRepository.getRating(id)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useRatingCompetitions(id: string) {
  return useQuery({
    queryKey: ['rating-competitions', id],
    queryFn: async () => {
      const result = await ratingRepository.getRatingCompetitions(id)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useStandings(ratingId: string, groupId: number | null) {
  return useQuery({
    queryKey: ['rating-standings', ratingId, groupId],
    queryFn: async () => {
      const result = await ratingRepository.getStandings(ratingId, groupId!)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data.standings
    },
    enabled: groupId != null,
  })
}
