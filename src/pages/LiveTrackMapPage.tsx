import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { liveTrackRepository } from '../api/liveTrackRepository'
import { LiveTrackMapView } from '../components/LiveTrackMapView'
import { Loading } from '../components/Loading'
import { useDistances } from '../features/competition-detail/hooks'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'
import { LiveTrackAccumulator, isActive, mergedByParticipant, isStale, type ViewerTrack } from '../lib/liveTrackAccumulator'
import { STALE_COLOR, trackColor } from '../lib/liveTrackColors'
import { distanceMapCorners } from '../lib/mapCorners'

/** Опрос, пока на дистанции есть участники. */
const LIVE_POLL_MS = 5_000
/** Опрос, когда все финишировали (вдруг кто-то ещё стартует). */
const IDLE_POLL_MS = 30_000
/** Пауза после ошибки сети. */
const ERROR_RETRY_MS = 10_000

interface LiveTracksState {
  loaded: boolean
  tracks: ViewerTrack[]
  /** Закреплённый номер цвета участника: не «прыгает» при изменении порядка списка. */
  colorIndex: Map<string, number>
  serverTime: number
  connectionLost: boolean
}

/**
 * Треки дистанции: архив один раз, затем опрос `live` с курсором — раз в 5 с, пока кто-то на
 * дистанции, иначе раз в 30 с. Пока вкладка браузера скрыта, опрос стоит.
 */
function useLiveTracks(competitionId: string, distanceId: number): LiveTracksState {
  const [state, setState] = useState<LiveTracksState>({ loaded: false, tracks: [], colorIndex: new Map(), serverTime: 0, connectionLost: false })

  useEffect(() => {
    const accumulator = new LiveTrackAccumulator()
    const colors = new Map<string, number>()
    let archiveLoaded = false
    let reported = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    async function tick() {
      if (disposed) return
      if (document.hidden) return // возобновится по visibilitychange
      if (!archiveLoaded) {
        const archive = await liveTrackRepository.getTracks(distanceId)
        if (archive.kind === 'success') {
          accumulator.applyArchive(archive.data)
          archiveLoaded = true
        }
      }
      const live = await liveTrackRepository.getLive(distanceId, accumulator.cursor)
      if (disposed) return
      if (live.kind === 'success') accumulator.applySnapshot(live.data)
      const ok = live.kind === 'success'
      // Перезапуски трека одним участником показываем как один трек.
      const tracks = mergedByParticipant(accumulator.list())
      for (const track of [...tracks].sort((a, b) => a.startedAt - b.startedAt)) {
        if (!colors.has(track.sessionId)) colors.set(track.sessionId, colors.size)
      }
      setState({
        loaded: true,
        tracks,
        colorIndex: new Map(colors),
        serverTime: accumulator.serverTime || Date.now(),
        connectionLost: !ok,
      })
      if (ok && !reported) {
        reported = true
        analytics.trackEvent(AnalyticsEvents.liveTrackMapOpened(competitionId, distanceId, accumulator.hasActive() ? 'live' : 'archive'))
      }
      timer = setTimeout(tick, !ok ? ERROR_RETRY_MS : accumulator.hasActive() ? LIVE_POLL_MS : IDLE_POLL_MS)
    }

    function onVisibilityChange() {
      if (document.hidden) return
      clearTimeout(timer)
      void tick()
    }

    void tick()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      disposed = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [competitionId, distanceId])

  return state
}

function statusText(track: ViewerTrack, serverTime: number): string {
  switch (track.status) {
    case 'ACTIVE':
      if (isStale(track, serverTime)) {
        const minutes = Math.max(1, Math.floor((serverTime - (track.lastPointAt ?? track.startedAt)) / 60_000))
        return `нет данных ${minutes} мин`
      }
      return 'на дистанции'
    case 'FINISHED':
      return 'финиш'
    case 'STOPPED':
      return 'трек остановлен'
    case 'TIMED_OUT':
      return 'трек закрыт'
  }
}

/**
 * Карта онлайн-треков дистанции для зрителя: растр карты по трём углам, КП, треки участников,
 * фильтр по группам, «хвост 5 мин» и список участников (клик — центрировать карту). Публичная.
 */
export function LiveTrackMapPage() {
  const { id, distanceId: distanceIdParam } = useParams<{ id: string; distanceId: string }>()
  const navigate = useNavigate()
  const competitionId = id!
  const distanceId = Number(distanceIdParam)

  const { data: distances } = useDistances(competitionId)
  const distance = distances?.find((d) => d.id === distanceId)
  const corners = distance ? distanceMapCorners(distance) : null
  const controlPoints = distance?.controlPoints.filter((cp) => cp.latitude != null && cp.longitude != null) ?? []

  const { loaded, tracks, colorIndex, serverTime, connectionLost } = useLiveTracks(competitionId, distanceId)

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [tailOnly, setTailOnly] = useState(false)
  const [focus, setFocus] = useState<{ lat: number; lon: number; seq: number } | null>(null)

  const groups = [...new Set(tracks.map((t) => t.groupName).filter((g): g is string => g != null))].sort()
  const visibleTracks = selectedGroups.size === 0 ? tracks : tracks.filter((t) => t.groupName != null && selectedGroups.has(t.groupName))
  const activeCount = tracks.filter(isActive).length

  function toggleGroup(group: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  function focusTrack(track: ViewerTrack) {
    const last = track.points[track.points.length - 1]
    if (last) setFocus((prev) => ({ lat: last.lat, lon: last.lon, seq: (prev?.seq ?? 0) + 1 }))
  }

  const chipClass = (selected: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm ${selected ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'}`

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-medium">{distance?.name ?? 'Онлайн-треки'}</h1>
          <p className="text-sm text-on-surface-variant">
            {!loaded
              ? 'Загрузка…'
              : activeCount > 0
                ? `На дистанции: ${activeCount} • треков: ${tracks.length}`
                : tracks.length === 0
                  ? 'Пока нет треков'
                  : `Архив треков: ${tracks.length}`}
          </p>
          {connectionLost && <p className="text-xs text-error">Нет связи с сервером треков — показаны последние данные</p>}
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        <button type="button" onClick={() => setTailOnly((v) => !v)} className={chipClass(tailOnly)}>
          Хвост 5 мин
        </button>
        {groups.map((group) => (
          <button key={group} type="button" onClick={() => toggleGroup(group)} className={chipClass(selectedGroups.has(group))}>
            {group}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1">
        {distances ? (
          <LiveTrackMapView
            mapUrl={distance?.mapUrl ?? null}
            corners={corners}
            controlPoints={controlPoints}
            tracks={visibleTracks}
            colorIndex={colorIndex}
            serverTime={serverTime}
            tailOnly={tailOnly}
            focus={focus}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loading />
          </div>
        )}
      </div>

      <ul className="max-h-[38vh] overflow-y-auto border-t border-outline-variant">
        {visibleTracks.map((track) => {
          const stale = isStale(track, serverTime)
          return (
            <li key={track.sessionId}>
              <button type="button" onClick={() => focusTrack(track)} className="flex w-full items-center gap-3 px-4 py-2 text-left">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ background: stale ? STALE_COLOR : trackColor(colorIndex, track.sessionId) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {track.startNumber != null && `№${track.startNumber} `}
                    {track.displayName}
                  </span>
                  {track.groupName && <span className="block text-xs text-on-surface-variant">{track.groupName}</span>}
                </span>
                <span className={`shrink-0 text-xs ${isActive(track) && !stale ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {statusText(track, serverTime)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
