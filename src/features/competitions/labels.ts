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

export function genderLabel(gender: string): string {
  switch (gender) {
    case 'M':
      return 'Мужчины'
    case 'F':
      return 'Женщины'
    default:
      return gender
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
