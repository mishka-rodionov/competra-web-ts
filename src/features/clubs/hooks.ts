import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { clubRepository } from '../../api/clubRepository'
import { teamRepository } from '../../api/teamRepository'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'

const CLUBS_PAGE_SIZE = 20

export function useSearchClubs(query: string) {
  return useInfiniteQuery({
    queryKey: ['clubs-search', query],
    queryFn: async ({ pageParam }) => {
      const result = await clubRepository.searchClubs(query, pageParam, CLUBS_PAGE_SIZE)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  })
}

export function useClub(clubId: string) {
  return useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const result = await clubRepository.getClub(clubId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useClubMembers(clubId: string) {
  return useQuery({
    queryKey: ['club-members', clubId],
    queryFn: async () => {
      const result = await clubRepository.getClubMembers(clubId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    // clubId может ещё не быть известен (например, TeamDetailPage — до загрузки команды).
    enabled: clubId !== '',
  })
}

export function useMyJoinRequests() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['my-join-requests'],
    queryFn: async () => {
      const result = await clubRepository.getMyJoinRequests()
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    enabled: isLoggedIn,
  })
}

export function useJoinRequestsForClub(clubId: string) {
  return useQuery({
    queryKey: ['club-join-requests', clubId],
    queryFn: async () => {
      const result = await clubRepository.getJoinRequestsForClub(clubId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useTeamsByClub(clubId: string) {
  return useQuery({
    queryKey: ['teams', clubId],
    queryFn: async () => {
      const result = await teamRepository.getTeamsByClub(clubId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const result = await teamRepository.getTeam(teamId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const result = await teamRepository.getTeamMembers(teamId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}
