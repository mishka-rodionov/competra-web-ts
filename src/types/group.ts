export interface CreateGroupRequest {
  /**
   * null — создать новую группу; ненулевое значение бэкенд трактует как id СУЩЕСТВУЮЩЕЙ
   * строки для апдейта без проверки владения соревнованием — категорически нельзя
   * подставлять сюда заглушку вроде 0.
   */
  groupId: number | null
  competitionId: string
  title: string
  gender: string | null
  minAge: number | null
  maxAge: number | null
  distanceId: number | null
  maxParticipants: number | null
  timeLimitMinutes: number | null
  scorePenaltyPerMinute: number | null
  maxLatenessMinutes: number | null
}
