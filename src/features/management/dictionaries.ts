import { ranksByScore } from '../../lib/byChoiceMode'

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

/** Итог формата «по выбору» — ключи совпадают с ByChoiceMode в Android/eSport. */
export const BY_CHOICE_MODE_OPTIONS: [string, string][] = [
  ['SCORE', 'По баллам'],
  ['MIN_CONTROLS', 'По количеству КП'],
]

export function byChoiceModeHint(mode: string): string {
  return mode === 'MIN_CONTROLS'
    ? 'Нужно взять не меньше заданного числа КП, места — по времени. Минимум и обязательные КП задаются у дистанции'
    : 'У каждого КП своя стоимость, места — по сумме баллов'
}

export const OVERTIME_POLICY_OPTIONS: [string, string][] = [
  ['IGNORE', 'Не учитывать'],
  ['DISQUALIFY', 'Дисквалифицировать'],
  ['SCORE_PENALTY', 'Штраф очками'],
]

/**
 * Штраф очками осмыслен только в score-О («по выбору» по баллам) — в остальных форматах, в т.ч.
 * «по выбору» с минимумом КП, очков нет.
 */
export function overtimePolicyOptionsFor(direction: string, byChoiceMode: string): [string, string][] {
  return ranksByScore(direction, byChoiceMode)
    ? OVERTIME_POLICY_OPTIONS
    : OVERTIME_POLICY_OPTIONS.filter(([key]) => key !== 'SCORE_PENALTY')
}

/**
 * Патч формы при смене направления или режима «по выбору»: выбранный штраф очками сбрасывается,
 * если в новом формате очков нет (как withValidOvertimePolicy в Android) — иначе он остался бы
 * невидимым в селекторе.
 */
export function formatPatch(
  direction: string,
  byChoiceMode: string,
  overtimePolicy: string,
): { direction: string; byChoiceMode: string; overtimePolicy: string } {
  const resetPolicy = overtimePolicy === 'SCORE_PENALTY' && !ranksByScore(direction, byChoiceMode)
  return { direction, byChoiceMode, overtimePolicy: resetPolicy ? 'IGNORE' : overtimePolicy }
}

/** Пояснение под селектором: что именно произойдёт с превысившими КВ. */
export function overtimePolicyHint(policy: string): string {
  switch (policy) {
    case 'DISQUALIFY':
      return 'Превысившие КВ снимаются и не получают места'
    case 'SCORE_PENALTY':
      return 'Опоздание штрафуется очками — настраивается у каждой группы'
    default:
      return 'КВ показывается участникам, но результаты засчитываются всем'
  }
}

/** Системы отметки, для которых имеет смысл электронная стартовая станция. */
const ELECTRONIC_PUNCHING_SYSTEMS = new Set(['SPORTIDUINO', 'SPORTIDENT', 'SFR'])

export function isElectronicPunchingSystem(punchingSystem: string): boolean {
  return ELECTRONIC_PUNCHING_SYSTEMS.has(punchingSystem)
}

/**
 * Системы отметки, доступные организатору при создании/редактировании. Остальные (карандаш,
 * компостер, SFR, SportIdent) пока не поддержаны в сценарии проведения, поэтому скрыты
 * (как SUPPORTED_PUNCHING_SYSTEMS в Android).
 */
const SUPPORTED_PUNCHING_SYSTEMS = new Set(['SPORTIDUINO'])

/**
 * Опции селектора системы отметки. Неподдерживаемая система уже сохранённого соревнования
 * ([current]) остаётся в списке, чтобы отображалась. При старте по стартовой станции
 * механическая/бумажная отметка (PENCIL/PUNCH) теряет смысл.
 */
export function punchingSystemOptionsFor(startTimeMode: string, current: string): [string, string][] {
  return PUNCHING_SYSTEM_OPTIONS.filter(([key]) => SUPPORTED_PUNCHING_SYSTEMS.has(key) || key === current).filter(
    ([key]) => startTimeMode !== 'BY_START_STATION' || isElectronicPunchingSystem(key),
  )
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
  ['USER_SET', 'По стартовому протоколу'],
  ['BY_START_STATION', 'По стартовой станции'],
]

/** Режимы старта, доступные организатору: STRICT пока не отработан в сценарии проведения. */
const SUPPORTED_START_TIME_MODES = new Set(['USER_SET', 'BY_START_STATION'])

/** Опции селектора способа старта; неподдерживаемый режим сохранённого соревнования остаётся в списке. */
export function startTimeModeOptionsFor(current: string): [string, string][] {
  return START_TIME_MODE_OPTIONS.filter(([key]) => SUPPORTED_START_TIME_MODES.has(key) || key === current)
}

/** Пояснение под селектором способа старта. */
export const START_TIME_MODE_HINT =
  'По протоколу — судья запускает отсчёт, участники уходят по жеребьёвке через интервал. ' +
  'По стартовой станции — время старта каждого фиксирует отметка на стартовой станции'

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
