import type { ParticipantGroupDetail } from '../types/competition'
import type { Gender, UserProfile } from '../types/user'

/**
 * Ограничение группы по полу. Поле gender у групп клиенты пишут в разных форматах: веб — "M"/"F",
 * Android — "MALE"/"FEMALE"/"MIXED". null, "MIXED" и прочее — без ограничения.
 * Та же логика — groupGenderRestriction в eSport (GroupEligibility.kt).
 */
export function groupGenderRestriction(gender: string | null): Gender | null {
  switch (gender?.trim().toUpperCase()) {
    case 'M':
    case 'MALE':
      return 'male'
    case 'F':
    case 'FEMALE':
      return 'female'
    default:
      return null
  }
}

/**
 * Год рождения из birthDate профиля (полночь в мс). Сдвиг на +12 ч перед взятием года в UTC
 * корректен и для UTC-полуночи (веб, Android), и для локальной полуночи старых клиентов.
 */
function birthYear(birthDate: number): number {
  return new Date(birthDate + 12 * 3600 * 1000).getUTCFullYear()
}

/** Год соревнования в его часовом поясе. */
export function competitionYear(startDate: number, timeZoneId: string): number {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: timeZoneId, year: 'numeric' }).format(startDate))
  } catch {
    return new Date(startDate).getUTCFullYear()
  }
}

export type GroupEligibility =
  | { eligible: true }
  /** fixInProfile — причину можно устранить, заполнив/исправив профиль (показываем ссылку). */
  | { eligible: false; reason: string; fixInProfile: boolean }

/**
 * Может ли пользователь зарегистрироваться в группу по полу и возрасту. Возраст — по году
 * рождения, как принято в ориентировании: год соревнования − год рождения. minAge/maxAge ≤ 0 —
 * без ограничения. Сервер (eSport, register) проверяет то же самое и с теми же текстами — здесь
 * проверка нужна, чтобы не показывать кнопку, которая заведомо закончится ошибкой.
 */
export function checkGroupEligibility(
  group: Pick<ParticipantGroupDetail, 'title' | 'gender' | 'minAge' | 'maxAge'>,
  profile: Pick<UserProfile, 'gender' | 'birthDate'>,
  year: number,
): GroupEligibility {
  const requiredGender = groupGenderRestriction(group.gender)
  if (requiredGender != null) {
    if (profile.gender == null) {
      return {
        eligible: false,
        reason: `Укажите пол в профиле, чтобы зарегистрироваться в группу ${group.title}`,
        fixInProfile: true,
      }
    }
    if (profile.gender !== requiredGender) {
      // Пользователям, зарегистрированным до появления поля, бэкенд отдаёт "male" вместо пустого
      // значения — поэтому предлагаем поправить профиль и здесь.
      return {
        eligible: false,
        reason: `Группа ${group.title} — только для ${requiredGender === 'male' ? 'мужчин' : 'женщин'}`,
        fixInProfile: true,
      }
    }
  }

  const min = group.minAge != null && group.minAge > 0 ? group.minAge : null
  const max = group.maxAge != null && group.maxAge > 0 ? group.maxAge : null
  if (min == null && max == null) return { eligible: true }

  if (profile.birthDate == null) {
    return {
      eligible: false,
      reason: `Укажите дату рождения в профиле, чтобы зарегистрироваться в группу ${group.title}`,
      fixInProfile: true,
    }
  }
  const born = birthYear(profile.birthDate)
  const age = year - born
  if ((min != null && age < min) || (max != null && age > max)) {
    return {
      eligible: false,
      reason: `Группа ${group.title} — для участников ${birthYearsRange(min, max, year)}, ваш год рождения — ${born}`,
      fixInProfile: false,
    }
  }
  return { eligible: true }
}

/** Возрастной диапазон группы в годах рождения: «2011–2012 г.р.», «2012 г.р. и моложе». */
export function birthYearsRange(minAge: number | null, maxAge: number | null, year: number): string {
  const oldest = maxAge != null ? year - maxAge : null
  const youngest = minAge != null ? year - minAge : null
  if (oldest != null && youngest != null) {
    return oldest === youngest ? `${oldest} г.р.` : `${oldest}–${youngest} г.р.`
  }
  return youngest != null ? `${youngest} г.р. и старше` : `${oldest} г.р. и моложе`
}
