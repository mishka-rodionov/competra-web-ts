import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { competitionRepository } from '../../api/competitionRepository'

const PAGE_SIZE = 20

export interface CompetitionsFilter {
  kindOfSports: string[]
  statuses: string[]
}

export const EMPTY_FILTER: CompetitionsFilter = { kindOfSports: [], statuses: [] }

export function isFilterEmpty(filter: CompetitionsFilter): boolean {
  return filter.kindOfSports.length === 0 && filter.statuses.length === 0
}

export function usePublicCompetitions(filter: CompetitionsFilter, includeTest = false) {
  return useInfiniteQuery({
    queryKey: ['public-competitions', filter, includeTest],
    queryFn: async ({ pageParam }) => {
      const result = await competitionRepository.getPublicCompetitions({
        kindOfSports: filter.kindOfSports,
        statuses: filter.statuses,
        includeTest,
        page: pageParam,
        limit: PAGE_SIZE,
      })
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  })
}

export function useMyCompetitions(enabled: boolean) {
  return useQuery({
    queryKey: ['my-competitions'],
    queryFn: async () => {
      const result = await competitionRepository.getMyCompetitions()
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    enabled,
  })
}
