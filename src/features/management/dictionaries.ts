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

/** Системы отметки, для которых имеет смысл электронная стартовая станция. */
const ELECTRONIC_PUNCHING_SYSTEMS = new Set(['SPORTIDUINO', 'SPORTIDENT', 'SFR'])

export function isElectronicPunchingSystem(punchingSystem: string): boolean {
  return ELECTRONIC_PUNCHING_SYSTEMS.has(punchingSystem)
}

/** При старте по стартовой станции механическая/бумажная отметка (PENCIL/PUNCH) теряет смысл. */
export function punchingSystemOptionsFor(startTimeMode: string): [string, string][] {
  return startTimeMode === 'BY_START_STATION'
    ? PUNCHING_SYSTEM_OPTIONS.filter(([key]) => isElectronicPunchingSystem(key))
    : PUNCHING_SYSTEM_OPTIONS
}

/**
 * Патч формы при смене режима старта: при переходе на «по стартовой станции» неэлектронная система
 * отметки сбрасывается на SPORTIDUINO (как в OrienteeringCreatorViewModel в Android), чтобы не остался
 * невалидный выбор — селектор системы отметки стоит на экране раньше селектора режима старта.
 */
export function startTimeModePatch(
  startTimeMode: string,
  punchingSystem: string,
): { startTimeMode: string; punchingSystem: string } {
  const resetPunching = startTimeMode === 'BY_START_STATION' && !isElectronicPunchingSystem(punchingSystem)
  return { startTimeMode, punchingSystem: resetPunching ? 'SPORTIDUINO' : punchingSystem }
}

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

export const STATUS_OPTIONS: [string, string][] = [
  ['REGISTRATION_OPEN', 'Регистрация открыта'],
  ['REGISTRATION_CLOSED', 'Регистрация закрыта'],
  ['CREATED', 'Черновик'],
  ['FINISHED', 'Завершено'],
]

/** null — «без ограничений»; LabeledSelect работает со string/number ключами, поэтому здесь '' вместо null. */
export const GENDER_OPTIONS: [string, string][] = [
  ['', 'Без ограничений'],
  ['M', 'Мужчины'],
  ['F', 'Женщины'],
]
