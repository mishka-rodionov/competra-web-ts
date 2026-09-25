import { TrackCodec } from './trackCodec'
import type { ArchivedTrackDto, LiveSnapshot, LiveTrackStatus } from '../types/liveTrack'

/** Разрыв между точками больше этого — трек не соединяется линией (потеря сигнала/связи). */
export const TRACK_GAP_MS = 30_000

/** Активный участник без новых точек дольше этого — «нет данных» (серый маркер). */
export const TRACK_STALE_MS = 60_000

export interface ViewerPoint {
  t: number
  lat: number
  lon: number
}

/** Трек участника у зрителя: метаданные и накопленные точки, отсортированные по времени. */
export interface ViewerTrack {
  sessionId: string
  participantId: string
  displayName: string
  groupName: string | null
  startNumber: number | null
  status: LiveTrackStatus
  startedAt: number
  lastPointAt: number | null
  points: ViewerPoint[]
}

export function isActive(track: ViewerTrack): boolean {
  return track.status === 'ACTIVE'
}

/**
 * Склеивает сессии одного участника (трек останавливали и включали заново) в один трек — порт
 * `mergedByParticipant` из competra-android.
 *
 * Ключ — `sessionId` самой ранней сессии, чтобы цвет и позиция не менялись при новой сессии. Имя,
 * группа и номер — из последней. Статус — активный, если активна хоть одна сессия, иначе статус
 * последней. Промежуток между сессиями дольше [TRACK_GAP_MS] рисуется разрывом, как потеря связи.
 * `lastPointAt` учитывает старт сессии без точек, чтобы свежий перезапуск не был «нет данных».
 * Порядок — по первому появлению участника в исходном списке.
 */
export function mergedByParticipant(tracks: ViewerTrack[]): ViewerTrack[] {
  const byParticipant = new Map<string, ViewerTrack[]>()
  for (const t of tracks) {
    const sessions = byParticipant.get(t.participantId)
    if (sessions) sessions.push(t)
    else byParticipant.set(t.participantId, [t])
  }
  return [...byParticipant.values()].map((sessions) => {
    if (sessions.length === 1) return sessions[0]
    const byStart = [...sessions].sort((a, b) => a.startedAt - b.startedAt)
    const latest = byStart[byStart.length - 1]
    const statusSource = [...byStart].reverse().find(isActive) ?? latest
    const activity = sessions.filter((s) => s.lastPointAt != null || isActive(s)).map((s) => s.lastPointAt ?? s.startedAt)
    return {
      ...latest,
      sessionId: byStart[0].sessionId,
      status: statusSource.status,
      startedAt: byStart[0].startedAt,
      lastPointAt: activity.length > 0 ? Math.max(...activity) : null,
      points: sessions.reduce<ViewerPoint[]>((acc, s) => merge(acc, s.points), []),
    }
  })
}

/** Активный участник, от которого давно нет точек (по часам сервера). */
export function isStale(track: ViewerTrack, serverTime: number): boolean {
  if (!isActive(track)) return false
  return serverTime - (track.lastPointAt ?? track.startedAt) > TRACK_STALE_MS
}

/** Отрезки трека: точки с разрывом больше [gapMs] не соединяются; [since] — только хвост. */
export function trackSegments(track: ViewerTrack, since: number | null = null, gapMs = TRACK_GAP_MS): ViewerPoint[][] {
  const visible = since == null ? track.points : track.points.filter((p) => p.t >= since)
  const result: ViewerPoint[][] = []
  for (const point of visible) {
    const current = result[result.length - 1]
    if (!current || point.t - current[current.length - 1].t > gapMs) result.push([point])
    else current.push(point)
  }
  return result
}

function merge(a: ViewerPoint[], b: ViewerPoint[]): ViewerPoint[] {
  const byTime = new Map<number, ViewerPoint>()
  for (const p of a) byTime.set(p.t, p)
  for (const p of b) byTime.set(p.t, p)
  return [...byTime.values()].sort((x, y) => x.t - y.t)
}

/**
 * Накапливает треки зрителя из архива (`tracks`) и последовательных снимков `live` — порт
 * `LiveTrackAccumulator` из competra-android (domain). Точки одной сессии объединяются без дублей
 * (по времени фикса) и сортируются: досланные после потери связи точки приходят позже, но «старше»
 * уже показанных. При `reset` точки сессий из снимка заменяются полными — архивные остаются.
 */
export class LiveTrackAccumulator {
  private tracks = new Map<string, ViewerTrack>()
  cursor: string | null = null
  serverTime = 0

  applyArchive(archive: ArchivedTrackDto[]) {
    for (const dto of archive) {
      const points = TrackCodec.decode(dto.startedAt, dto.trackEncoded).map((p) => ({ t: p.timestampMs, lat: p.lat, lon: p.lon }))
      const archived: ViewerTrack = {
        sessionId: dto.sessionId,
        participantId: dto.participantId,
        displayName: dto.displayName,
        groupName: dto.groupName,
        startNumber: dto.startNumber,
        status: dto.status,
        startedAt: dto.startedAt,
        lastPointAt: points.length > 0 ? points[points.length - 1].t : null,
        points,
      }
      const existing = this.tracks.get(dto.sessionId)
      if (!existing) this.tracks.set(dto.sessionId, archived)
      else if (!isActive(archived)) this.tracks.set(dto.sessionId, { ...archived, points: merge(existing.points, points) })
      else this.tracks.set(dto.sessionId, { ...existing, points: merge(existing.points, points) })
    }
  }

  applySnapshot(snapshot: LiveSnapshot) {
    for (const s of snapshot.sessions) {
      const incoming = s.points.map(([t, lat, lon]) => ({ t, lat, lon }))
      const existing = this.tracks.get(s.sessionId)
      const points = !existing || snapshot.reset ? merge([], incoming) : merge(existing.points, incoming)
      this.tracks.set(s.sessionId, {
        sessionId: s.sessionId,
        participantId: s.participantId,
        displayName: s.displayName,
        groupName: s.groupName,
        startNumber: s.startNumber,
        status: s.status,
        startedAt: s.startedAt,
        lastPointAt: s.lastPointAt,
        points,
      })
    }
    this.cursor = snapshot.cursor
    this.serverTime = snapshot.serverTime
  }

  /** Треки: сначала на дистанции, затем по стартовому номеру и имени. */
  list(): ViewerTrack[] {
    return [...this.tracks.values()].sort(
      (a, b) =>
        Number(isActive(b)) - Number(isActive(a)) ||
        (a.startNumber ?? Number.MAX_SAFE_INTEGER) - (b.startNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.displayName.localeCompare(b.displayName),
    )
  }

  hasActive(): boolean {
    return [...this.tracks.values()].some(isActive)
  }
}
