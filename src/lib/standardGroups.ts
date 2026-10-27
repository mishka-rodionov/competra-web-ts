/**
 * Шаблоны и разбор названий групп для мастера создания соревнования.
 * Тот же набор и те же правила — в Android (`StandardGroups.kt` в `:domain`).
 */

/** Стандартные группы в порядке показа: дети и юноши, основные, ветераны, Open. */
export const STANDARD_GROUP_TITLES = [
  'М10', 'Ж10', 'М12', 'Ж12', 'М14', 'Ж14', 'М16', 'Ж16', 'М18', 'Ж18',
  'М21', 'Ж21',
  'М35', 'Ж35', 'М45', 'Ж45', 'М55', 'Ж55', 'М65', 'Ж65',
  'Open',
]

/** Пол ('M' / 'F' / null) и возраст (год соревнования − год рождения), выведенные из названия группы. */
export interface GroupTitleInfo {
  gender: string | null
  minAge: number | null
  maxAge: number | null
}

/** Возраст основной группы: «М21»/«Ж21» — без ограничения по возрасту. */
const ELITE_AGE = 21
const TITLE_REGEX = /^\s*(МЖ|MW|ЖМ|WM|М|M|Ж|W|F|Д)\s*(\d{1,2})/i

/**
 * Разбирает название группы: меньше 21 — «до N лет», больше 21 — «N лет и старше», 21 — без возраста.
 * Латинские M/W/F понимаются так же, как кириллические М/Ж. null — название не похоже на обозначение
 * группы (Open, «Новички»).
 */
export function parseGroupTitle(title: string): GroupTitleInfo | null {
  const match = TITLE_REGEX.exec(title)
  if (!match) return null
  const letter = match[1].toUpperCase()
  const gender = letter === 'М' || letter === 'M' ? 'M' : ['Ж', 'W', 'F', 'Д'].includes(letter) ? 'F' : null
  const age = parseInt(match[2], 10)
  if (age < ELITE_AGE) return { gender, minAge: null, maxAge: age }
  if (age > ELITE_AGE) return { gender, minAge: age, maxAge: null }
  return { gender, minAge: null, maxAge: null }
}

function normalize(value: string): string {
  return value.toUpperCase().replace(/\s/g, '').replace(/M/g, 'М').replace(/W/g, 'Ж')
}

/**
 * Ключ дистанции для группы по совпадению названий: Mapper часто называет дистанции так же, как группы.
 * [options] — пары [ключ, название] из списка дистанций мастера.
 */
export function matchDistanceKey(groupTitle: string, options: [string, string][]): string | null {
  const key = normalize(groupTitle)
  return options.find(([, name]) => normalize(name) === key)?.[0] ?? null
}
