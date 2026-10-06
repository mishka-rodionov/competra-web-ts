import { trackSegments, type ViewerPoint, type ViewerTrack } from './liveTrackAccumulator'

/**
 * Окно сглаживания скорости: в лесу GPS «прыгает» на десятки метров, и скорость между соседними
 * точками шумная. Скорость в точке — смещение между краями окна вокруг неё, делённое на время.
 */
export const SPEED_WINDOW_MS = 20_000

/** Число ступеней цвета шкалы скорости: соседние отрезки одной ступени рисуются одной линией. */
export const SPEED_COLOR_STEPS = 16

/** Концы шкалы — перцентили скорости самого участника: выбросы GPS и стояние на старте не растягивают её. */
const SLOW_PERCENTILE = 0.05
const FAST_PERCENTILE = 0.95

/** Разброс скоростей меньше этого (м/с) — шкалы нет, весь трек одного «среднего» цвета. */
const MIN_SPEED_RANGE = 0.05

const EARTH_RADIUS_METERS = 6_371_000

/** Кусок трека одного цвета: `level` 0 — самый медленный (красный), SPEED_COLOR_STEPS − 1 — самый быстрый. */
export interface SpeedChunk {
  level: number
  /** Соседние куски одного отрезка делят точку стыка — линия непрерывна. */
  points: ViewerPoint[]
}

/** Трек, раскрашенный по скорости относительно самого участника; скорости — в м/с. */
export interface TrackSpeedProfile {
  chunks: SpeedChunk[]
  slowSpeed: number
  fastSpeed: number
}

/**
 * Раскраска трека по скорости — порт `speedProfile` из competra-android: сглаженная скорость в каждой
 * точке, шкала от 5-го до 95-го перцентиля скоростей участника, разбиение на ступени. `null` — точек
 * для расчёта скорости мало.
 */
export function speedProfile(track: ViewerTrack, windowMs = SPEED_WINDOW_MS, steps = SPEED_COLOR_STEPS): TrackSpeedProfile | null {
  const segments = trackSegments(track).filter((s) => s.length > 1)
  const speeds = segments.map((s) => smoothedSpeeds(s, windowMs))
  const sorted = speeds.flat().filter((v): v is number => v != null).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const slow = percentile(sorted, SLOW_PERCENTILE)
  const fast = percentile(sorted, FAST_PERCENTILE)

  const level = (speed: number): number => {
    if (fast - slow < MIN_SPEED_RANGE) return Math.floor((steps - 1) / 2)
    return Math.round(Math.min(1, Math.max(0, (speed - slow) / (fast - slow))) * (steps - 1))
  }

  const chunks: SpeedChunk[] = []
  segments.forEach((segment, si) => {
    const filled = filledGaps(speeds[si])
    if (!filled) return
    // Цвет отрезка между точками — по средней скорости его концов.
    const edgeLevels = segment.slice(0, -1).map((_, i) => level((filled[i] + filled[i + 1]) / 2))
    let start = 0
    for (let i = 1; i <= edgeLevels.length; i++) {
      if (i === edgeLevels.length || edgeLevels[i] !== edgeLevels[start]) {
        chunks.push({ level: edgeLevels[start], points: segment.slice(start, i + 1) })
        start = i
      }
    }
  })
  return { chunks, slowSpeed: slow, fastSpeed: fast }
}

/**
 * Сглаженная скорость (м/с) в каждой точке отрезка: смещение между крайними точками окна ±windowMs/2.
 * В окне всегда есть хотя бы один сосед. `null` — у точек окна одинаковое время (архив округляет до секунды).
 */
function smoothedSpeeds(points: ViewerPoint[], windowMs: number): (number | null)[] {
  const half = windowMs / 2
  let lo = 0
  let hi = 0
  return points.map((point, i) => {
    while (points[lo].t < point.t - half) lo++
    if (hi < i) hi = i
    while (hi + 1 < points.length && points[hi + 1].t <= point.t + half) hi++
    const from = lo === i && i > 0 ? i - 1 : lo
    const to = hi === i && i < points.length - 1 ? i + 1 : hi
    const dt = points[to].t - points[from].t
    return dt <= 0 ? null : distanceMeters(points[from], points[to]) / (dt / 1000)
  })
}

/** Точки без скорости берут скорость ближайшей предыдущей (в начале — первой известной). */
function filledGaps(speeds: (number | null)[]): number[] | null {
  const first = speeds.find((v) => v != null)
  if (first == null) return null
  let last = first
  return speeds.map((v) => (last = v ?? last))
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.round((sorted.length - 1) * p)]
}

function distanceMeters(from: ViewerPoint, to: ViewerPoint): number {
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLon = ((to.lon - from.lon) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
