export interface OrienteeringParticipant {
  id: string
  userId: string | null
  firstName: string
  lastName: string
  groupId: number
  groupName: string | null
  competitionId: string
  commandName: string | null
  startNumber: string | null
  startTime: number | null
  chipNumber: number | null
  comment: string | null
  isChipGiven: boolean
}

export interface SplitTime {
  controlPoint: number
  timestamp: number
}

export interface OrienteeringResult {
  id: string
  competitionId: string
  groupId: number
  participantId: string
  startTime: number | null
  finishTime: number | null
  /** В секундах — см. formatTime в lib/dateUtils. */
  totalTime: number | null
  rank: number | null
  status: string
  penaltyTime: number
  splits: SplitTime[] | null
  totalScore: number | null
  scorePenalty: number
  isEditable: boolean
  isEdited: boolean
}
