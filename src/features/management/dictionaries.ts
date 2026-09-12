/** Словари значений соревнования — ключи совпадают с enum'ами Android/бэкенда. */

export const DIRECTION_OPTIONS: [string, string][] = [
  ['FORWARD', 'В заданном направлении'],
  ['BY_CHOICE', 'По выбору'],
  ['MARKING', 'Маркированная трасса'],
]

export const PUNCHING_SYSTEM_OPTIONS: [string, string][] = [
  ['PENCIL', 'Карандаш'],
  ['PUNCH', 'Компостер'],
  ['SPORTIDUINO', 'Sportiduino'],
  ['SFR', 'SFR'],
  ['SPORTIDENT', 'SportIdent'],
]

export const START_TIME_MODE_OPTIONS: [string, string][] = [
  ['STRICT', 'Строгое время старта'],
  ['USER_SET', 'Задаётся перед стартом'],
  ['BY_START_STATION', 'По отметке на старте'],
]

/** Интервал между стартами: 20..180 с шагом 20. */
export const START_INTERVAL_OPTIONS: number[] = Array.from({ length: 9 }, (_, i) => (i + 1) * 20)

export function formatIntervalSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes === 0) return `${secs} сек`
  if (secs === 0) return `${minutes} мин`
  return `${minutes} мин ${secs} сек`
}

export const REG_END_MODE_OPTIONS: [string, string][] = [
  ['AT_COMPETITION_START', 'В момент старта'],
  ['DAY_BEFORE_START', 'За день до старта'],
]
