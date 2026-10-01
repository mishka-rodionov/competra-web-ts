import { useQuery, type QueryClient } from '@tanstack/react-query'
import { participantLinkRepository } from '../../api/participantLinkRepository'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'

export function useLinkSuggestions() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['link-suggestions'],
    queryFn: async () => {
      const result = await participantLinkRepository.getSuggestions()
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    enabled: isLoggedIn,
  })
}

export function useMyLinkRequests() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['my-link-requests'],
    queryFn: async () => {
      const result = await participantLinkRepository.getMyRequests()
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    enabled: isLoggedIn,
  })
}

export function useCompetitionLinkRequests(competitionId: string) {
  return useQuery({
    queryKey: ['competition-link-requests', competitionId],
    queryFn: async () => {
      const result = await participantLinkRepository.getCompetitionRequests(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

/** Ошибка не бросается: счётчики — второстепенная подсказка, список соревнований должен работать и без них. */
export function usePendingLinkCounts() {
  const isLoggedIn = useIsLoggedIn()
  return useQuery({
    queryKey: ['link-pending-counts'],
    queryFn: async () => {
      const result = await participantLinkRepository.getPendingCounts()
      return result.kind === 'success' ? result.data : {}
    },
    enabled: isLoggedIn,
  })
}

/** После любой заявки/решения/отвязки меняются и списки заявок, и сам участник (userId), и «мои старты». */
export async function invalidateLinkQueries(queryClient: QueryClient, competitionId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['link-suggestions'] }),
    queryClient.invalidateQueries({ queryKey: ['my-link-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['link-pending-counts'] }),
    queryClient.invalidateQueries({ queryKey: ['registered-competitions'] }),
    competitionId
      ? queryClient.invalidateQueries({ queryKey: ['competition-link-requests', competitionId] })
      : queryClient.invalidateQueries({ queryKey: ['competition-link-requests'] }),
    competitionId
      ? queryClient.invalidateQueries({ queryKey: ['participants', competitionId] })
      : queryClient.invalidateQueries({ queryKey: ['participants'] }),
  ])
}
