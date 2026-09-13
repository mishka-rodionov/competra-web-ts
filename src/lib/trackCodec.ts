/** Точка GPS-трека тренировки. */
export interface TrackPoint {
  lat: number
  lon: number
  timestampMs: number
}

const POINT_SEPARATOR = ';'
const FIELD_SEPARATOR = ':'
const COORD_PRECISION = 100_000

/**
 * Кодирует/декодирует GPS-трек тренировки одной компактной строкой вместо построчного
 * хранения. Формат: точки через `;`, поля точки через `:` — `latE5:lonE5:tOffsetSec`.
 * Продублирован в Android-приложении и на бэкенде (eSport) — при изменении формата нужно
 * синхронно поправить все копии.
 */
export const TrackCodec = {
  encode(startedAtMs: number, points: TrackPoint[]): string {
    return points
      .map((point) => {
        const latE5 = Math.round(point.lat * COORD_PRECISION)
        const lonE5 = Math.round(point.lon * COORD_PRECISION)
        const tOffsetSec = Math.round((point.timestampMs - startedAtMs) / 1000)
        return `${latE5}${FIELD_SEPARATOR}${lonE5}${FIELD_SEPARATOR}${tOffsetSec}`
      })
      .join(POINT_SEPARATOR)
  },

  decode(startedAtMs: number, encoded: string | null | undefined): TrackPoint[] {
    if (!encoded?.trim()) return []
    return encoded
      .split(POINT_SEPARATOR)
      .map((chunk): TrackPoint | null => {
        const fields = chunk.split(FIELD_SEPARATOR)
        if (fields.length !== 3) return null
        const latE5 = parseInt(fields[0], 10)
        const lonE5 = parseInt(fields[1], 10)
        const tOffsetSec = parseInt(fields[2], 10)
        if (Number.isNaN(latE5) || Number.isNaN(lonE5) || Number.isNaN(tOffsetSec)) return null
        return {
          lat: latE5 / COORD_PRECISION,
          lon: lonE5 / COORD_PRECISION,
          timestampMs: startedAtMs + tOffsetSec * 1000,
        }
      })
      .filter((p): p is TrackPoint => p != null)
  },
}
