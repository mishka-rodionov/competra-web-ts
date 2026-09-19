export type AnalyticsParams = Record<string, string | number | boolean | null>

export interface AnalyticsEvent {
  name: string
  params?: AnalyticsParams
}

/**
 * Типобезопасный словарь продуктовых событий — зеркалит AnalyticsEvent.kt из competra-android
 * (те же имена и параметры), чтобы Web и Android сопоставлялись в одном отчёте.
 * Конвенции: имя — snake_case вида `<domain>_<action>`, категориальные значения — union-типы,
 * PII не передаём (email — только домен, серверные тексты ошибок — только категория).
 * Здесь только то, что есть в веб-клиенте; NFC/жеребьёвка Android-специфичны.
 */

export type AuthFailureReason = 'invalid_code' | 'network'
export type EventSource = 'list'
export type ParticipantAddMethod = 'manual' | 'import'
export type CreateCompetitionStep = 'common' | 'registration' | 'organizator' | 'distance' | 'groups'

export const AnalyticsEvents = {
  // Auth / Registration
  authLoginRequested: (emailDomain: string): AnalyticsEvent => ({
    name: 'auth_login_requested',
    params: { email_domain: emailDomain },
  }),
  authCodeSubmitted: { name: 'auth_code_submitted' } as AnalyticsEvent,
  authLoginSuccess: { name: 'auth_login_success' } as AnalyticsEvent,
  authLoginFailed: (reason: AuthFailureReason): AnalyticsEvent => ({
    name: 'auth_login_failed',
    params: { reason },
  }),
  registrationSubmitted: { name: 'registration_submitted' } as AnalyticsEvent,
  registrationSuccess: { name: 'registration_success' } as AnalyticsEvent,
  logout: { name: 'logout' } as AnalyticsEvent,

  // Events (просмотр / участие)
  eventOpened: (eventId: string, source: EventSource): AnalyticsEvent => ({
    name: 'event_opened',
    params: { event_id: eventId, source },
  }),
  eventFilterApplied: (filters: AnalyticsParams): AnalyticsEvent => ({
    name: 'event_filter_applied',
    params: filters,
  }),
  eventRegisterClicked: (eventId: string): AnalyticsEvent => ({
    name: 'event_register_clicked',
    params: { event_id: eventId },
  }),

  // Create competition (центр)
  createCompetitionStarted: (kindOfSport: string): AnalyticsEvent => ({
    name: 'create_competition_started',
    params: { kind_of_sport: kindOfSport },
  }),
  createCompetitionStepCompleted: (step: CreateCompetitionStep): AnalyticsEvent => ({
    name: 'create_competition_step_completed',
    params: { step },
  }),
  createCompetitionFinished: (competitionId: string, kindOfSport: string): AnalyticsEvent => ({
    name: 'create_competition_finished',
    params: { competition_id: competitionId, kind_of_sport: kindOfSport },
  }),
  competitionDeleted: (competitionId: string): AnalyticsEvent => ({
    name: 'competition_deleted',
    params: { competition_id: competitionId },
  }),
  participantAdded: (method: ParticipantAddMethod): AnalyticsEvent => ({
    name: 'participant_added',
    params: { method },
  }),

  // Results
  resultsViewed: (eventId: string): AnalyticsEvent => ({
    name: 'results_viewed',
    params: { event_id: eventId },
  }),
  groupSplitsTableOpened: (groupId: string, competitionId: string): AnalyticsEvent => ({
    name: 'group_splits_table_opened',
    params: { group_id: groupId, competition_id: competitionId },
  }),
  raceGraphOpened: (groupId: string, competitionId: string): AnalyticsEvent => ({
    name: 'race_graph_opened',
    params: { group_id: groupId, competition_id: competitionId },
  }),
  scoreGraphOpened: (groupId: string, competitionId: string): AnalyticsEvent => ({
    name: 'score_graph_opened',
    params: { group_id: groupId, competition_id: competitionId },
  }),

  // Profile
  profileEditSaved: { name: 'profile_edit_saved' } as AnalyticsEvent,
  accountDeletionRequested: { name: 'account_deletion_requested' } as AnalyticsEvent,
  accountDeletionSucceeded: { name: 'account_deletion_succeeded' } as AnalyticsEvent,
  accountDeletionFailed: (reason: string): AnalyticsEvent => ({
    name: 'account_deletion_failed',
    params: { reason },
  }),

  // Diary
  diaryWorkoutSaved: (sportType: string, status: string, isNew: boolean): AnalyticsEvent => ({
    name: 'diary_workout_saved',
    params: { sport_type: sportType.toLowerCase(), status: status.toLowerCase(), is_new: isNew },
  }),
  diaryWorkoutDeleted: (sportType: string): AnalyticsEvent => ({
    name: 'diary_workout_deleted',
    params: { sport_type: sportType.toLowerCase() },
  }),

  // Clubs
  clubCreated: (clubId: string): AnalyticsEvent => ({ name: 'club_created', params: { club_id: clubId } }),
  clubUpdated: (clubId: string): AnalyticsEvent => ({ name: 'club_updated', params: { club_id: clubId } }),
  clubDeleted: (clubId: string): AnalyticsEvent => ({ name: 'club_deleted', params: { club_id: clubId } }),
  clubJoinRequested: (clubId: string): AnalyticsEvent => ({
    name: 'club_join_requested',
    params: { club_id: clubId },
  }),
  clubJoinRequestReviewed: (clubId: string, approved: boolean): AnalyticsEvent => ({
    name: 'club_join_request_reviewed',
    params: { club_id: clubId, approved },
  }),
  clubMemberRemoved: (clubId: string, isSelf: boolean): AnalyticsEvent => ({
    name: 'club_member_removed',
    params: { club_id: clubId, is_self: isSelf },
  }),
  clubMemberRoleChanged: (clubId: string, newRole: string): AnalyticsEvent => ({
    name: 'club_member_role_changed',
    params: { club_id: clubId, new_role: newRole.toLowerCase() },
  }),
  clubTeamCreated: (clubId: string): AnalyticsEvent => ({
    name: 'club_team_created',
    params: { club_id: clubId },
  }),

  // Rating
  ratingCreated: (ratingId: string, clubId: string): AnalyticsEvent => ({
    name: 'rating_created',
    params: { rating_id: ratingId, club_id: clubId },
  }),
  ratingCompetitionAdded: (ratingId: string, competitionId: string): AnalyticsEvent => ({
    name: 'rating_competition_added',
    params: { rating_id: ratingId, competition_id: competitionId },
  }),
  ratingGroupMappingConfirmed: (ratingId: string, competitionId: string): AnalyticsEvent => ({
    name: 'rating_group_mapping_confirmed',
    params: { rating_id: ratingId, competition_id: competitionId },
  }),
  ratingDeleted: (ratingId: string): AnalyticsEvent => ({
    name: 'rating_deleted',
    params: { rating_id: ratingId },
  }),
} as const
