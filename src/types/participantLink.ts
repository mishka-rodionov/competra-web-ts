/**
 * Заявки на привязку вручную внесённого участника к аккаунту — зеркало ParticipantLinkResponses.kt (eSport).
 * Бэкенд (Gson) не сериализует null-поля, поэтому nullable-поля здесь опциональные.
 */

/** UNLINKED — была одобрена, потом участника отвязали. */
export type LinkRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'UNLINKED'
/** SUGGESTION — из подсказок по имени в профиле, MANUAL — пользователь сам выбрал участника в протоколе. */
export type LinkRequestSource = 'SUGGESTION' | 'MANUAL'

/** Коротко о результате участника — чтобы человек узнал свой старт. */
export interface LinkResultSummary {
  rank?: number | null
  /** В секундах — см. formatTime в lib/dateUtils. */
  totalTime?: number | null
  totalScore?: number | null
  status: string
}

/** Непривязанный участник, похожий по имени на текущего пользователя. */
export interface LinkSuggestion {
  participantId: string
  competitionId: string
  competitionTitle: string
  competitionStartDate: number
  firstName: string
  lastName: string
  groupName: string
  commandName?: string | null
  result?: LinkResultSummary | null
}

/** Заявка глазами заявителя. */
export interface LinkRequest {
  id: string
  participantId: string
  competitionId: string
  competitionTitle: string
  competitionStartDate: number
  participantFirstName: string
  participantLastName: string
  groupName: string
  status: LinkRequestStatus
  source: LinkRequestSource
  comment?: string | null
  createdAt: number
}

/** Заявка глазами организатора — с подсказками для проверки. */
export interface CompetitionLinkRequest {
  id: string
  status: LinkRequestStatus
  source: LinkRequestSource
  comment?: string | null
  createdAt: number
  participantId: string
  participantFirstName: string
  participantLastName: string
  groupName: string
  commandName?: string | null
  startNumber: number
  result?: LinkResultSummary | null
  userId: string
  userFirstName: string
  userLastName: string
  userBirthYear?: number | null
  userGender?: 'male' | 'female' | null
  /** Имя в протоколе совпадает с профилем заявителя. */
  nameMatches: boolean
  /** Пол/возраст заявителя не подходят к группе участника (или их не проверить). */
  eligibilityWarning?: string | null
  /** Сколько ещё заявок на рассмотрении на этого же участника от других пользователей. */
  competingRequests: number
  /** У заявителя уже есть свой участник в этом соревновании — одобрить нельзя, нужно удалить дубль. */
  userAlreadyInCompetition: boolean
}
