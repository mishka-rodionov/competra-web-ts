/** Цвета участников — те же, что в Android: контрастные на топокарте и не похожие на пурпурные КП. */
export const TRACK_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#00ACC1', '#6D4C41', '#3949AB', '#7CB342', '#00897B', '#F4511E']

/** Цвет активного участника, от которого давно нет данных. */
export const STALE_COLOR = '#9E9E9E'

/** Цвет КП на карте. */
export const CONTROL_POINT_COLOR = '#C000C0'

/** «Хвост» — последние столько миллисекунд трека. */
export const TAIL_WINDOW_MS = 5 * 60_000

/** Цвет участника по его закреплённому номеру в [colorIndex]. */
export function trackColor(colorIndex: Map<string, number>, sessionId: string): string {
  return TRACK_COLORS[(colorIndex.get(sessionId) ?? 0) % TRACK_COLORS.length]
}
