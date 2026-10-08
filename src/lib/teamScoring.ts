import type { TeamScoring, TeamScoringRequest } from '../types/teamStandings'

/** Умолчания при включении командного зачёта — как в Android и eSport. */
export const DEFAULT_TEAM_SCORING: TeamScoring = { groupMethod: 'POINTS', groupCountedResults: 3, overallScopes: [] }

export const TEAM_SCORING_METHOD_OPTIONS: [string, string][] = [
  ['POINTS', 'По очкам за места'],
  ['TIME', 'По сумме времени'],
]

/** Общие зачёты в порядке вывода. */
export const TEAM_OVERALL_SCOPES: [string, string][] = [
  ['MEN', 'Мужчины'],
  ['WOMEN', 'Женщины'],
  ['ALL', 'Общий'],
]

export function overallScopeLabel(scope: string): string {
  return TEAM_OVERALL_SCOPES.find(([key]) => key === scope)?.[1] ?? scope
}

/**
 * Настройки для запроса соревнования: выключенный зачёт — явный enabled = false (не передать поле
 * значит «не менять»). В score-О зачёт по времени недоступен — уходит как очки.
 */
export function teamScoringRequest(value: TeamScoring | null, isScoreO: boolean): TeamScoringRequest {
  if (value == null) return { enabled: false }
  return {
    enabled: true,
    groupMethod: isScoreO ? 'POINTS' : value.groupMethod,
    groupCountedResults: value.groupCountedResults,
    overallScopes: value.overallScopes,
  }
}

/** Командный зачёт для аналитики: none / groups / both (общие зачёты всегда строятся из зачётов в группах). */
export function teamScoringAnalyticsValue(value: TeamScoring | null): string {
  if (value == null) return 'none'
  return value.overallScopes.length > 0 ? 'both' : 'groups'
}
