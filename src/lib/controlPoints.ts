import type { ControlPoint } from '../types/distance'

/**
 * Разбирает поле «КП через пробел». Для обычных дистанций — просто номера ("31 32 33").
 * Для «по выбору» (BY_CHOICE) каждый номер может нести баллы через двоеточие ("31:2 32:5"),
 * при отсутствии баллов — дефолт 2 (как на Android).
 */
export function parseControlPoints(input: string, isByChoice: boolean): ControlPoint[] {
  return input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token): ControlPoint | null => {
      const [numberStr, scoreStr] = token.split(':')
      const number = parseInt(numberStr, 10)
      if (Number.isNaN(number)) return null
      const parsedScore = scoreStr != null ? parseInt(scoreStr, 10) : NaN
      const score = Number.isNaN(parsedScore) ? (isByChoice ? 2 : 0) : parsedScore
      return { number, role: 'ORDINARY', score, latitude: null, longitude: null }
    })
    .filter((cp): cp is ControlPoint => cp != null)
}
