import type { Distance } from '../types/distance'
import { isRequiredControl } from './controlPoints'

/**
 * Итог формата «по выбору» (direction = BY_CHOICE): SCORE — score-О, места по сумме баллов;
 * MIN_CONTROLS — нужно взять не меньше минимума КП дистанции (и все обязательные), места по времени.
 * Проверки `direction === 'BY_CHOICE'` в коде означают «свободный порядок» и общие для обоих режимов;
 * развилка «баллы или время» — только ranksByScore. То же в Android (ByChoiceMode.kt) и eSport.
 */

/** true, если места считаются по сумме баллов (score-О). Отсутствующий режим (старые ответы сервера) — SCORE. */
export function ranksByScore(direction: string, byChoiceMode: string | null | undefined): boolean {
  return direction === 'BY_CHOICE' && (byChoiceMode ?? 'SCORE') !== 'MIN_CONTROLS'
}

/** true для «по выбору» с минимумом КП: места по времени, баллов нет. */
export function isMinControls(direction: string, byChoiceMode: string | null | undefined): boolean {
  return direction === 'BY_CHOICE' && byChoiceMode === 'MIN_CONTROLS'
}

/** Формат соревнования для аналитики: forward / marking / by_choice_score / by_choice_min_controls (как в Android). */
export function competitionFormat(direction: string, byChoiceMode: string): string {
  return direction === 'BY_CHOICE' ? `by_choice_${byChoiceMode.toLowerCase()}` : direction.toLowerCase()
}

/** «Взять 18 из 20 КП» / «Взять все КП (20)» — правило дистанции «по выбору» с минимумом КП. */
export function minControlsLabel(minControlsCount: number | null | undefined, controlsCount: number): string {
  return minControlsCount != null && minControlsCount > 0
    ? `Взять ${minControlsCount} из ${controlsCount} КП`
    : `Взять все КП (${controlsCount})`
}

/** Номера обязательных КП дистанции по порядку. */
export function requiredControlNumbers(distance: Distance): number[] {
  return distance.controlPoints.filter(isRequiredControl).map((cp) => cp.number)
}

/**
 * Предупреждение после импорта IOF XML, если дистанции в файле подготовлены под другой формат:
 * режим соревнования при этом не меняется, лишние данные просто не учитываются. Дистанция
 * «свободный порядок» из Mapper приходит с minControlsCount (0 у «взять все» сервер хранит как null),
 * дистанция с баллами — с score у КП.
 */
export function importedCoursesWarning(
  distances: Distance[],
  direction: string,
  byChoiceMode: string | null | undefined,
): string | null {
  const withScores = distances.some((d) => d.controlPoints.some((cp) => cp.score > 0))
  const withMinimum = distances.some((d) => d.minControlsCount != null)
  if (isMinControls(direction, byChoiceMode)) {
    return withScores
      ? 'В файле дистанции с баллами, а соревнование — «по выбору» по количеству КП: баллы не учитываются. Проверьте минимум КП у дистанций.'
      : null
  }
  if (ranksByScore(direction, byChoiceMode)) {
    if (withMinimum) {
      return 'В файле дистанции «свободный порядок» с минимумом КП, а соревнование — «по выбору» по баллам: минимум не учитывается. Смените итог на «По количеству КП» или задайте баллы КП.'
    }
    return withScores ? null : 'У КП в файле нет баллов, а соревнование — «по выбору» по баллам.'
  }
  return withScores || withMinimum
    ? 'В файле дистанции «по выбору», а соревнование — в заданном направлении: участники будут проверяться по порядку КП.'
    : null
}
