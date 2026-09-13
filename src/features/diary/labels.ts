/** Словари значений тренировочного дневника — ключи совпадают с enum'ами Android/бэкенда. */

export const SPORT_TYPE_OPTIONS: [string, string][] = [
  ['RUNNING', 'Бег'],
  ['CYCLING', 'Велоспорт'],
  ['SKIING', 'Лыжи'],
]

export function sportTypeLabel(sportType: string): string {
  return SPORT_TYPE_OPTIONS.find(([key]) => key === sportType)?.[1] ?? sportType
}

export const WORKOUT_STATUS_OPTIONS: [string, string][] = [
  ['COMPLETED', 'Выполнена'],
  ['PLANNED', 'Запланирована'],
]

export function workoutStatusLabel(status: string): string {
  return WORKOUT_STATUS_OPTIONS.find(([key]) => key === status)?.[1] ?? status
}

export const SKI_STYLE_OPTIONS: [string, string][] = [
  ['CLASSIC', 'Классика'],
  ['SKATE', 'Коньковый'],
]

export function skiStyleLabel(style: string): string {
  return SKI_STYLE_OPTIONS.find(([key]) => key === style)?.[1] ?? style
}

/** "1 ч 5 мин" / "45 мин" — компактный формат длительности для карточек списка. */
export function formatWorkoutDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`
  if (hours > 0) return `${hours} ч`
  return `${minutes} мин`
}

/** "5.2 км" — дистанция в километрах с одним знаком после запятой. */
export function formatDistanceKm(meters: number): string {
  const km = meters / 1000
  const rounded = Math.round(km * 10) / 10
  return `${rounded} км`
}
