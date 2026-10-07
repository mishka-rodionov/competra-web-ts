import type { ControlPoint } from '../types/distance'

/** Роль обязательного КП — в нижнем регистре, как пишут Android (Gson) и парсер IOF XML в eSport. */
export const REQUIRED_ROLE = 'required'

/** Роль КП сравнивается без учёта регистра: веб исторически пишет 'ORDINARY', Android и eSport — 'ordinary'. */
export function isRequiredControl(cp: ControlPoint): boolean {
  return cp.role.toLowerCase() === REQUIRED_ROLE
}

/**
 * Разбирает поле «КП через пробел». Для обычных дистанций — просто номера ("31 32 33").
 * Для «по выбору» (BY_CHOICE):
 *  - в score-О ([withScores]) номер может нести баллы через двоеточие ("31:2 32:5"), при отсутствии
 *    баллов — дефолт 2 (как на Android); в «по выбору» с минимумом КП баллов нет;
 *  - звёздочка помечает обязательный КП ("31* 32:5*").
 */
export function parseControlPoints(input: string, isByChoice: boolean, withScores: boolean = isByChoice): ControlPoint[] {
  return input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token): ControlPoint | null => {
      const required = isByChoice && token.includes('*')
      const [numberStr, scoreStr] = token.replace(/\*/g, '').split(':')
      const number = parseInt(numberStr, 10)
      if (Number.isNaN(number)) return null
      const parsedScore = withScores && scoreStr != null ? parseInt(scoreStr, 10) : NaN
      const score = Number.isNaN(parsedScore) ? (withScores ? 2 : 0) : parsedScore
      return { number, role: required ? REQUIRED_ROLE : 'ORDINARY', score, latitude: null, longitude: null }
    })
    .filter((cp): cp is ControlPoint => cp != null)
}
