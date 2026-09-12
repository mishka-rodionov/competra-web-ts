import { useQuery } from '@tanstack/react-query'
import { competitionRepository } from '../../api/competitionRepository'
import { userRepository } from '../../api/userRepository'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'

export function useUserProfile() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const result = await userRepository.getUserProfile()
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    enabled: isLoggedIn,
  })
}

export function useUpcomingCompetitions() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['registered-competitions'],
    queryFn: async () => {
      const result = await competitionRepository.getRegisteredCompetitions()
      if (result.kind === 'error') throw new Error(result.message)
      const now = Date.now()
      return result.data
        .filter((c) => c.competition.startDate >= now)
        .sort((a, b) => a.competition.startDate - b.competition.startDate)
    },
    enabled: isLoggedIn,
  })
}
