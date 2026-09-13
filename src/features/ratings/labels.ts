export const RATING_GENDER_OPTIONS: [string, string][] = [
  ['', 'Любой'],
  ['MALE', 'Мужчины'],
  ['FEMALE', 'Женщины'],
  ['MIXED', 'Смешанная'],
]

export function ratingGenderLabel(gender: string | null): string {
  switch (gender) {
    case 'MALE':
      return 'Мужчины'
    case 'FEMALE':
      return 'Женщины'
    case 'MIXED':
      return 'Смешанная'
    default:
      return 'Любой'
  }
}

export function startsCountLabel(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'стартов'
  if (mod10 === 1) return 'старт'
  if (mod10 >= 2 && mod10 <= 4) return 'старта'
  return 'стартов'
}

/** Таблица очков по месту — соответствует RatingPointsTable на бэкенде (таблица IOF World Cup). */
export const FIXED_RATING_POINTS: [number, number][] = [
  [1, 100],
  [2, 80],
  [3, 60],
  [4, 50],
  [5, 45],
  [6, 40],
  [7, 37],
  [8, 35],
  [9, 33],
]
