import { ranksByScore } from './byChoiceMode'

/**
 * Формат дистанции: направление (FORWARD / BY_CHOICE / MARKING) и режим «по выбору»
 * (SCORE / MIN_CONTROLS, значим только при BY_CHOICE).
 *
 * У соревнования это формат по умолчанию, дистанция может задать свой (`direction` /
 * `byChoiceMode` у дистанции, null — «как у соревнования»). Формат группы — формат её дистанции.
 * Та же логика в Android (CourseFormat.kt) и eSport; спека —
 * competra-android/docs/specs/per-distance-format.md.
 */
export interface CourseFormat {
  direction: string
  byChoiceMode: string
}

/** Значение формата дистанции в запросе «как у соревнования» (сервер хранит null; null в запросе — «не менять»). */
export const INHERIT_FORMAT = 'INHERIT'

/** Формат соревнования по умолчанию; отсутствующие значения (старые ответы сервера) — FORWARD / SCORE. */
export function competitionCourseFormat(direction?: string | null, byChoiceMode?: string | null): CourseFormat {
  return { direction: direction || 'FORWARD', byChoiceMode: byChoiceMode || 'SCORE' }
}

/** Эффективный формат дистанции: свои значения, иначе — соревнования. Нет дистанции — формат соревнования. */
export function effectiveFormat(
  distance: { direction?: string | null; byChoiceMode?: string | null } | null | undefined,
  competition: CourseFormat,
): CourseFormat {
  return {
    direction: distance?.direction || competition.direction,
    byChoiceMode: distance?.byChoiceMode || competition.byChoiceMode,
  }
}

/** true, если места на дистанции этого формата считаются по баллам (score-О). */
export function formatRanksByScore(format: CourseFormat): boolean {
  return ranksByScore(format.direction, format.byChoiceMode)
}

/** Одинаковые ли правила: режим «по выбору» сравнивается только при BY_CHOICE. */
export function sameFormat(a: CourseFormat, b: CourseFormat): boolean {
  return a.direction === b.direction && (a.direction !== 'BY_CHOICE' || a.byChoiceMode === b.byChoiceMode)
}

/** true, если у какой-то дистанции формат отличается от формата соревнования. */
export function isMixedFormat(
  distances: { direction?: string | null; byChoiceMode?: string | null }[],
  competition: CourseFormat,
): boolean {
  return distances.some((d) => !sameFormat(effectiveFormat(d, competition), competition))
}

/** Человекочитаемое название формата. */
export function formatLabel(format: CourseFormat): string {
  switch (format.direction) {
    case 'BY_CHOICE':
      return format.byChoiceMode === 'MIN_CONTROLS' ? 'По выбору — по количеству КП' : 'По выбору — по баллам'
    case 'MARKING':
      return 'Маркированная трасса'
    default:
      return 'В заданном направлении'
  }
}

/** Вариант формата в редакторе дистанции: «как у соревнования» или свой формат одним полем. */
const DISTANCE_FORMAT_FIELDS: Record<string, { direction: string | null; byChoiceMode: string | null }> = {
  [INHERIT_FORMAT]: { direction: null, byChoiceMode: null },
  FORWARD: { direction: 'FORWARD', byChoiceMode: null },
  BY_CHOICE_SCORE: { direction: 'BY_CHOICE', byChoiceMode: 'SCORE' },
  BY_CHOICE_MIN_CONTROLS: { direction: 'BY_CHOICE', byChoiceMode: 'MIN_CONTROLS' },
  MARKING: { direction: 'MARKING', byChoiceMode: null },
}

/** Варианты селектора формата дистанции: [ключ, подпись]; у «как у соревнования» в скобках формат соревнования. */
export function distanceFormatOptions(competition: CourseFormat): [string, string][] {
  return Object.entries(DISTANCE_FORMAT_FIELDS).map(([key, fields]) => [
    key,
    key === INHERIT_FORMAT
      ? `Как у соревнования (${formatLabel(competition)})`
      : formatLabel(effectiveFormat(fields, competition)),
  ])
}

/** Ключ варианта для сохранённой дистанции; «по выбору» без своего режима — с режимом соревнования. */
export function distanceFormatOption(
  distance: { direction?: string | null; byChoiceMode?: string | null } | null | undefined,
  competition: CourseFormat,
): string {
  if (!distance?.direction) return INHERIT_FORMAT
  const mode = distance.byChoiceMode || competition.byChoiceMode
  const found = Object.entries(DISTANCE_FORMAT_FIELDS).find(
    ([, f]) => f.direction === distance.direction && (distance.direction !== 'BY_CHOICE' || f.byChoiceMode === mode),
  )
  return found?.[0] ?? INHERIT_FORMAT
}

/** Поля дистанции для варианта селектора (null — как у соревнования). */
export function distanceFormatFields(option: string): { direction: string | null; byChoiceMode: string | null } {
  return DISTANCE_FORMAT_FIELDS[option] ?? DISTANCE_FORMAT_FIELDS[INHERIT_FORMAT]
}

/** Политики КВ соревнования по виду дистанции. */
export interface OvertimePolicies {
  /** Для дистанций, где места по времени: IGNORE / DISQUALIFY. */
  time: string
  /** Для дистанций с баллами: IGNORE / DISQUALIFY / SCORE_PENALTY. */
  score: string
}

/**
 * Разбирает политики из ответа сервера. Старый сервер (нет новых полей) — политика вида формата по
 * умолчанию из legacy `overtimePolicy`, другого вида — умолчание. Штраф очками для дистанций по
 * времени не применяется.
 */
export function resolveOvertimePolicies(
  legacy: string | null | undefined,
  time: string | null | undefined,
  score: string | null | undefined,
  competitionRanksByScore: boolean,
): OvertimePolicies {
  const timePolicy = time || (!competitionRanksByScore ? legacy : null) || 'IGNORE'
  const scorePolicy = score || (competitionRanksByScore ? legacy : null) || 'SCORE_PENALTY'
  return { time: timePolicy === 'SCORE_PENALTY' ? 'IGNORE' : timePolicy, score: scorePolicy }
}

/** Политика КВ для дистанции заданного вида. */
export function overtimePolicyFor(policies: OvertimePolicies, ranksByScoreCourse: boolean): string {
  return ranksByScoreCourse ? policies.score : policies.time
}

/** Политики КВ соревнования для повторной отправки как есть (публикация результатов и т.п.). */
export function overtimePoliciesRequest(competition: {
  direction: string
  byChoiceMode?: string
  overtimePolicy: string
  timeOvertimePolicy?: string
  scoreOvertimePolicy?: string
}): { timeOvertimePolicy: string; scoreOvertimePolicy: string } {
  const policies = resolveOvertimePolicies(
    competition.overtimePolicy,
    competition.timeOvertimePolicy,
    competition.scoreOvertimePolicy,
    ranksByScore(competition.direction, competition.byChoiceMode),
  )
  return { timeOvertimePolicy: policies.time, scoreOvertimePolicy: policies.score }
}

/**
 * Формат группы из деталки соревнования (сервер присылает эффективный формат её дистанции). Старый
 * сервер его не присылает — тогда формат соревнования.
 */
export function groupDetailFormat(
  group: { direction?: string | null; byChoiceMode?: string | null } | null | undefined,
  competition: CourseFormat,
): CourseFormat {
  return group?.direction ? { direction: group.direction, byChoiceMode: group.byChoiceMode || 'SCORE' } : competition
}
