import { groupGenderRestriction } from '../../lib/groupEligibility'

export const SPORT_TYPES: [string, string][] = [
  ['Orienteering', 'Ориентирование'],
  ['CrossCountrySki', 'Лыжное ориентирование'],
  ['TrailRunning', 'Трейловый бег'],
]

export const STATUSES: [string, string][] = [
  ['REGISTRATION_OPEN', 'Регистрация открыта'],
  ['REGISTRATION_CLOSED', 'Регистрация закрыта'],
  ['IN_PROGRESS', 'Идёт'],
  ['FINISHED', 'Завершено'],
]

export function statusLabel(status: string): string {
  switch (status) {
    case 'REGISTRATION_OPEN':
      return 'Регистрация открыта'
    case 'REGISTRATION_CLOSED':
      return 'Регистрация закрыта'
    case 'IN_PROGRESS':
    case 'STARTED':
      return 'Идёт'
    case 'FINISHED':
      return 'Завершено'
    case 'CREATED':
    case 'DRAFT':
    case 'ANNOUNCED':
      return 'Черновик'
    default:
      return status
  }
}

export function statusColorClass(status: string): string {
  switch (status) {
    case 'REGISTRATION_OPEN':
      return 'text-primary'
    case 'IN_PROGRESS':
    case 'STARTED':
      return 'text-secondary'
    case 'FINISHED':
      return 'text-outline'
    default:
      return 'text-on-surface-variant'
  }
}

export function sportLabel(kind: string): string {
  return SPORT_TYPES.find(([key]) => key === kind)?.[1] ?? kind
}

/** Подпись пола группы (форматы веба "M"/"F" и Android "MALE"/"FEMALE"); null — без ограничения. */
export function genderLabel(gender: string | null): string | null {
  switch (groupGenderRestriction(gender)) {
    case 'male':
      return 'Мужчины'
    case 'female':
      return 'Женщины'
    default:
      return null
  }
}

export function resultStatusLabel(status: string): string {
  switch (status) {
    case 'FINISHED':
      return 'Финиш'
    case 'DNF':
      return 'НФ'
    case 'DNS':
      return 'НС'
    case 'OVERTIME':
      return 'Прев. КВ'
    case 'DSQ':
      return 'Дискв.'
    default:
      return status
  }
}

/**
 * Место для отображения: только у FINISHED и только положительное. Бэкенд проставляет
 * снятым/не финишировавшим rank = -1 — такие участники вне зачёта, место им не показываем
 * (статус и так виден в отдельной колонке).
 */
export function resultPlaceLabel(
  result: { status: string; rank: number | null },
  participant?: { isOutOfCompetition?: boolean } | null,
): string {
  // Участник вне конкурса места не получает (rank = null) — у финишировавшего пишем «ВК».
  if (participant?.isOutOfCompetition) return result.status === 'FINISHED' ? OUT_OF_COMPETITION_PLACE : '—'
  return result.status === 'FINISHED' && result.rank != null && result.rank > 0 ? String(result.rank) : '—'
}

/** Текст графы «Место» у финишировавшего участника вне конкурса. */
export const OUT_OF_COMPETITION_PLACE = 'ВК'

/**
 * Порядок строк протокола группы: финишировавшие — по тому же ключу, что и места (score-О — очки
 * убыв., затем время; иначе время со штрафом), поэтому участник вне конкурса стоит среди остальных
 * по своему результату. Остальные статусы — после финишировавших, в исходном порядке.
 */
export function compareResultsForProtocol(byScore: boolean) {
  return (
    a: { status: string; totalTime: number | null; penaltyTime: number; totalScore: number | null },
    b: { status: string; totalTime: number | null; penaltyTime: number; totalScore: number | null },
  ): number => {
    const aFinished = a.status === 'FINISHED'
    const bFinished = b.status === 'FINISHED'
    if (aFinished !== bFinished) return aFinished ? -1 : 1
    if (!aFinished) return 0
    if (byScore) {
      const byPoints = (b.totalScore ?? 0) - (a.totalScore ?? 0)
      if (byPoints !== 0) return byPoints
      return (a.totalTime ?? Infinity) - (b.totalTime ?? Infinity)
    }
    return (a.totalTime ?? Infinity) + a.penaltyTime - ((b.totalTime ?? Infinity) + b.penaltyTime)
  }
}

export function resultStatusColorClass(status: string): string {
  switch (status) {
    case 'FINISHED':
      return 'text-primary'
    case 'DNF':
    case 'DSQ':
    case 'OVERTIME':
      return 'text-error'
    default:
      return 'text-on-surface-variant'
  }
}
