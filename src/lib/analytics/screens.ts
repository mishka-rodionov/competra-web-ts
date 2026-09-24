/**
 * Каталог экранов для `screen_view` — ключ — путь маршрута из routes.tsx (так, как он записан
 * в конфиге роутера, с `:param`), значение — screenName. Имена совпадают с AnalyticsScreen.kt
 * из competra-android там, где экран есть на обеих платформах; остальное — `<area>_<screen>`.
 * Маршруты без записи не трекаются (как и в Android — технические destination'ы не засоряют отчёт).
 */
const SCREENS: Record<string, string> = {
  '/': 'events_list',
  '/competition/:id': 'event_details',
  '/competition/:id/group/:groupId/splits': 'event_group_splits_table',
  '/competition/:id/group/:groupId/race-graph': 'event_race_graph',
  '/competition/:id/group/:groupId/score-graph': 'event_score_graph',
  '/competition/:id/participant/:participantId/splits': 'participant_splits',
  '/competition/:id/live-tracks/:distanceId': 'event_live_track_map',

  '/management': 'center_home',
  '/management/create': 'create_competition',
  '/management/:id': 'event_control',

  '/profile': 'profile_home',
  '/profile/edit': 'profile_editor',
  '/about': 'about_app',
  '/privacy': 'privacy_policy',

  '/diary': 'diary_list',
  '/diary/create': 'diary_workout_editor',
  '/diary/:id': 'diary_workout_detail',
  '/diary/:id/edit': 'diary_workout_editor',
  '/diary/:id/track': 'diary_workout_track',

  '/clubs': 'clubs_list',
  '/clubs/create': 'club_create',
  '/clubs/my-join-requests': 'club_my_join_requests',
  '/clubs/:id': 'club_detail',
  '/clubs/:id/join-requests': 'club_join_requests',
  '/teams/:id': 'club_team_detail',

  '/ratings': 'ratings_search',
  '/ratings/create': 'rating_create',
  '/ratings/:id': 'rating_detail',
  '/ratings/:id/edit': 'rating_edit',
  '/ratings/:id/add-competition': 'rating_add_competition',
  '/ratings/:id/mapping/:competitionId': 'rating_group_mapping',
  '/ratings/:id/athlete/:groupId/:participantKey': 'rating_athlete_starts',
}

export function screenNameForRoute(routePath: string | undefined): string | null {
  if (!routePath) return null
  return SCREENS[routePath] ?? null
}
