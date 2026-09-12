import { useQuery } from '@tanstack/react-query'
import { competitionRepository } from '../../api/competitionRepository'
import { groupRepository } from '../../api/groupRepository'

export function useManagedCompetition(competitionId: string) {
  return useQuery({
    queryKey: ['managed-competition', competitionId],
    queryFn: async () => {
      const result = await competitionRepository.getById(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useGroups(competitionId: string) {
  return useQuery({
    queryKey: ['groups', competitionId],
    queryFn: async () => {
      const result = await groupRepository.getGroups(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}
