import { useQuery } from '@tanstack/react-query'
import { competitionRepository } from '../../api/competitionRepository'
import { userRepository } from '../../api/userRepository'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'
import { analytics } from '../../lib/analytics/analytics'
import type { OrienteeringCompetition } from '../../types/competition'

export function useUserProfile() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const result = await userRepository.getUserProfile()
      if (result.kind === 'error') throw new Error(result.message)
      analytics.setUserId(result.data.id)
      return result.data
    },
    enabled: isLoggedIn,
  })
}

/**
 * Соревнования, где у пользователя есть привязанный участник — и самостоятельные регистрации,
 * и одобренные заявки на привязку ручных результатов. Будущие и прошедшие — один запрос, разный select.
 */
function useRegisteredCompetitions<T>(select: (data: OrienteeringCompetition[]) => T) {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['registered-competitions'],
    queryFn: async () => {
      const result = await competitionRepository.getRegisteredCompetitions()
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    select,
    enabled: isLoggedIn,
  })
}

function selectUpcoming(data: OrienteeringCompetition[]) {
  const now = Date.now()
  return data
    .filter((c) => c.competition.startDate >= now)
    .sort((a, b) => a.competition.startDate - b.competition.startDate)
}

function selectPast(data: OrienteeringCompetition[]) {
  const now = Date.now()
  return data
    .filter((c) => c.competition.startDate < now)
    .sort((a, b) => b.competition.startDate - a.competition.startDate)
}

export function useUpcomingCompetitions() {
  return useRegisteredCompetitions(selectUpcoming)
}

export function usePastCompetitions() {
  return useRegisteredCompetitions(selectPast)
}
