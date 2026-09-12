import { useQuery } from '@tanstack/react-query'
import { clubRepository } from '../../api/clubRepository'
import { competitionRepository } from '../../api/competitionRepository'
import { distanceRepository } from '../../api/distanceRepository'
import { resultRepository } from '../../api/resultRepository'

export function useCompetitionDetail(competitionId: string) {
  return useQuery({
    queryKey: ['competition-detail', competitionId],
    queryFn: async () => {
      const result = await competitionRepository.getCompetitionDetail(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useOrganizerClubName(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ['club-name', clubId],
    queryFn: async () => {
      const result = await clubRepository.getClub(clubId!)
      return result.kind === 'success' ? result.data.name : null
    },
    enabled: clubId != null,
  })
}

export function useDistances(competitionId: string) {
  return useQuery({
    queryKey: ['distances', competitionId],
    queryFn: async () => {
      const result = await distanceRepository.getByCompetition(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

export function useParticipants(competitionId: string) {
  return useQuery({
    queryKey: ['participants', competitionId],
    queryFn: async () => {
      const result = await resultRepository.getParticipants(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })
}

const LIVE_STATUSES = new Set(['IN_PROGRESS', 'STARTED'])
const LIVE_POLL_INTERVAL_MS = 30_000

export function useResults(competitionId: string, competitionStatus: string) {
  return useQuery({
    queryKey: ['results', competitionId],
    queryFn: async () => {
      const result = await resultRepository.getResults(competitionId)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
    refetchInterval: LIVE_STATUSES.has(competitionStatus) ? LIVE_POLL_INTERVAL_MS : false,
  })
}
