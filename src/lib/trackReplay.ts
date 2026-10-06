import { TRACK_GAP_MS, type ViewerPoint, type ViewerTrack } from './liveTrackAccumulator'

/** Яркий «хвост» за маркером при просмотре: последние столько миллисекунд пути. */
export const REPLAY_TAIL_MS = 2 * 60_000

/**
 * Шкала времени просмотра: `real` — все по общим часам (позиция ползунка — Unix ms), `mass` — каждый
 * от своего старта, все выбегают одновременно (позиция — ms от старта).
 */
export type ReplayTimeMode = 'real' | 'mass'

/** Что делает участник в момент просмотра; `noData` — разрыв связи, показывается последняя известная точка. */
export type ReplayRunnerState = 'notStarted' | 'running' | 'noData' | 'finished'

/** Положение участника в момент просмотра; `point.t` — момент просмотра. */
export interface ReplayPosition {
  point: ViewerPoint
  state: ReplayRunnerState
}

/**
 * Завершённый трек для просмотра — порт `ReplayTrack` из competra-android: точки только от старта до
 * финиша участника; `startAt`/`finishAt` (Unix ms) — из результата, иначе края трека.
 */
export interface ReplayTrack {
  track: ViewerTrack
  startAt: number
  finishAt: number
}

/**
 * Трек для просмотра, обрезанный по старту и финишу из результата: без разминки и дороги обратно.
 * Если результата нет или после обрезки остаётся меньше двух точек — весь трек. `null` — точек меньше двух.
 */
export function toReplay(track: ViewerTrack, startTime: number | null, finishTime: number | null): ReplayTrack | null {
  const { points } = track
  if (points.length < 2) return null
  const start = startTime ?? points[0].t
  const finish = finishTime != null && finishTime > start ? finishTime : points[points.length - 1].t
  const trimmed = points.filter((p) => p.t >= start && p.t <= finish)
  if (trimmed.length >= 2) return { track: { ...track, points: trimmed }, startAt: start, finishAt: finish }
  return { track, startAt: points[0].t, finishAt: points[points.length - 1].t }
}

/** Момент (Unix ms) для позиции ползунка `position`. */
export function replayTimeAt(replay: ReplayTrack, position: number, mode: ReplayTimeMode): number {
  return mode === 'real' ? position : replay.startAt + position
}

/** Положение в момент `t`: между фиксами — линейная интерполяция; в разрыве дольше TRACK_GAP_MS — последняя точка. */
export function replayPositionAt(replay: ReplayTrack, t: number): ReplayPosition {
  const { points } = replay.track
  const first = points[0]
  const last = points[points.length - 1]
  if (t < replay.startAt) return { point: { ...first, t }, state: 'notStarted' }
  if (t <= first.t) return { point: { ...first, t }, state: 'running' }
  if (t >= replay.finishAt) return { point: { ...last, t }, state: 'finished' }
  if (t >= last.t) return { point: { ...last, t }, state: t - last.t > TRACK_GAP_MS ? 'noData' : 'running' }
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (points[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  const a = points[lo]
  const b = points[lo + 1]
  if (b.t - a.t > TRACK_GAP_MS) return { point: { ...a, t }, state: 'noData' }
  const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t)
  return { point: { t, lat: a.lat + (b.lat - a.lat) * k, lon: a.lon + (b.lon - a.lon) * k }, state: 'running' }
}

/** Путь за последние `length` ms до момента `t`, заканчивающийся текущим положением; разрывы не соединяются. */
export function replayTail(replay: ReplayTrack, t: number, length = REPLAY_TAIL_MS): ViewerPoint[][] {
  if (t < replay.startAt) return []
  const now = Math.min(t, replay.finishAt)
  const window = replay.track.points.filter((p) => p.t > now - length && p.t <= now)
  const position = replayPositionAt(replay, now)
  if (position.state === 'running' && window[window.length - 1]?.t !== now) window.push(position.point)
  const result: ViewerPoint[][] = []
  for (const point of window) {
    const current = result[result.length - 1]
    if (!current || point.t - current[current.length - 1].t > TRACK_GAP_MS) result.push([point])
    else current.push(point)
  }
  return result
}

/** Диапазон ползунка: в реальном времени — от первого старта до последнего финиша, иначе 0…самое долгое время. */
export function replayRange(tracks: ReplayTrack[], mode: ReplayTimeMode): [number, number] | null {
  if (tracks.length === 0) return null
  if (mode === 'real') return [Math.min(...tracks.map((r) => r.startAt)), Math.max(...tracks.map((r) => r.finishAt))]
  return [0, Math.max(...tracks.map((r) => r.finishAt - r.startAt))]
}
