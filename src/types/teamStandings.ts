/** Настройки командного зачёта соревнования (как TeamScoring в Android/eSport); null — зачёта нет. */
export interface TeamScoring {
  /** POINTS / TIME — способ подсчёта в группе. */
  groupMethod: string
  /** N — сколько лучших результатов команды в группе идёт в зачёт. */
  groupCountedResults: number
  /** MEN / WOMEN / ALL — общие зачёты. */
  overallScopes: string[]
}

/** Командный зачёт в запросе соревнования: не передан — не менять, enabled = false — выключить. */
export interface TeamScoringRequest {
  enabled: boolean
  groupMethod?: string
  groupCountedResults?: number
  overallScopes?: string[]
}

/** Вычисленный командный зачёт (GET …/competitions/{id}/team-standings). */
export interface TeamStandings {
  groupMethod: string
  groupCountedResults: number
  groupStandings: GroupTeamStanding[]
  overallStandings: OverallTeamStanding[]
}

export interface GroupTeamStanding {
  groupId: number
  groupTitle: string
  /** N этой группы — своё или соревнования (нет у ответов сервера до 09.10.2026). */
  countedResults?: number
  teams: GroupTeam[]
}

export interface GroupTeam {
  /** Нет — вне зачёта. */
  place?: number | null
  teamName: string
  points?: number | null
  timeSeconds?: number | null
  /** Вошедшие в зачёт — первыми. */
  members: TeamMemberResult[]
}

export interface TeamMemberResult {
  participantId: string
  firstName: string
  lastName: string
  place?: number | null
  status: string
  points: number
  timeSeconds?: number | null
  counted: boolean
}

export interface OverallTeamStanding {
  /** MEN / WOMEN / ALL. */
  scope: string
  teams: OverallTeam[]
}

export interface OverallTeam {
  place: number
  teamName: string
  points: number
  groups: { groupId: number; groupTitle: string; place: number; points: number }[]
}
