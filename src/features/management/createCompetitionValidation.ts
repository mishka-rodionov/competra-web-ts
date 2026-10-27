import { zonedDateTimeToUtcMillis } from '../../lib/dateUtils'
import type { CreateCompetitionFormState } from './types'

/** Момент старта соревнования (UTC мс) или null, если дата ещё не выбрана. */
export function competitionStartMillis(form: CreateCompetitionFormState): number | null {
  return form.startDateStr ? zonedDateTimeToUtcMillis(form.startDateStr, form.startTime, form.zoneId) : null
}

/** Регистрация открывается позже старта соревнования — такую форму дальше не пускаем. */
export function isRegistrationStartAfterCompetition(form: CreateCompetitionFormState): boolean {
  if (form.registrationOpenImmediately || !form.regStartDateStr) return false
  const start = competitionStartMillis(form)
  return start != null && zonedDateTimeToUtcMillis(form.regStartDateStr, form.regStartTime, form.zoneId) > start
}

/** Телефон обязателен: по нему участники связываются с организатором (как в Android). */
export function isOrganizerStepValid(form: CreateCompetitionFormState): boolean {
  return form.contactPhone.trim() !== ''
}

