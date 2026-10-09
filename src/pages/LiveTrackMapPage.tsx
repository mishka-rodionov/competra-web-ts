import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { liveTrackRepository } from '../api/liveTrackRepository'
import { resultRepository } from '../api/resultRepository'
import { LiveTrackMapView, type MapFocus } from '../components/LiveTrackMapView'
import { Loading } from '../components/Loading'
import { useDistances } from '../features/competition-detail/hooks'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'
import { LiveTrackAccumulator, isActive, mergedByParticipant, isStale, type ViewerTrack } from '../lib/liveTrackAccumulator'
import { STALE_COLOR, speedColor, trackColor } from '../lib/liveTrackColors'
import { distanceMapCorners } from '../lib/mapCorners'
import { SPEED_COLOR_STEPS, speedProfile, type TrackSpeedProfile } from '../lib/trackSpeed'
import {
  replayPositionAt,
  replayRange,
  replayTimeAt,
  toReplay,
  type ReplayTimeMode,
  type ReplayTrack,
} from '../lib/trackReplay'

/** Опрос, пока на дистанции есть участники. */
const LIVE_POLL_MS = 5_000
/** Опрос, когда все финишировали (вдруг кто-то ещё стартует). */
const IDLE_POLL_MS = 30_000
/** Пауза после ошибки сети. */
const ERROR_RETRY_MS = 10_000
/** Медленнее этого (м/с) темп не пишем — участник стоит. */
const STANDING_SPEED = 0.2
/** Шаг анимации просмотра. */
const REPLAY_FRAME_MS = 100
/** Скорости воспроизведения (во сколько раз быстрее реального времени). */
const PLAYBACK_SPEEDS = [1, 10, 30, 60]
/** Скорость воспроизведения по умолчанию: часовая гонка — за две минуты. */
const DEFAULT_PLAYBACK_SPEED = 30
/** Перезапрос результатов, если появился финишировавший без результата, — не чаще. */
const RESULTS_RELOAD_MS = 60_000

interface LiveTracksState {
  loaded: boolean
  tracks: ViewerTrack[]
  /** Закреплённый номер цвета участника: не «прыгает» при изменении порядка списка. */
  colorIndex: Map<string, number>
  serverTime: number
  connectionLost: boolean
  /** Раскраска по скорости завершённых треков по id сессии. */
  speedProfiles: Map<string, TrackSpeedProfile>
  /** Завершённые треки, обрезанные по старту и финишу из результатов, по id сессии. */
  replayTracks: Map<string, ReplayTrack>
}

/**
 * Треки дистанции: архив один раз, затем опрос `live` с курсором — раз в 5 с, пока кто-то на
 * дистанции, иначе раз в 30 с. Пока вкладка браузера скрыта, опрос стоит.
 */
function useLiveTracks(competitionId: string, distanceId: number): LiveTracksState {
  const [state, setState] = useState<LiveTracksState>({
    loaded: false,
    tracks: [],
    colorIndex: new Map(),
    serverTime: 0,
    connectionLost: false,
    speedProfiles: new Map(),
    replayTracks: new Map(),
  })

  useEffect(() => {
    const accumulator = new LiveTrackAccumulator()
    const colors = new Map<string, number>()
    // Раскраска пересчитывается, только если у трека изменились точки: опрос отдаёт новые массивы с теми же точками.
    const speedCache = new Map<string, { key: string; profile: TrackSpeedProfile | null }>()
    // Старт и финиш из результатов по id участника — для обрезки треков при просмотре.
    let resultTimes = new Map<string, { start: number | null; finish: number | null }>()
    let resultsLoadedAt = 0
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
      // Результаты — при первом опросе и когда появился закрытый трек участника без результата.
      const missing = accumulator.list().some((t) => !isActive(t) && !resultTimes.has(t.participantId))
      if (resultsLoadedAt === 0 || (missing && Date.now() - resultsLoadedAt >= RESULTS_RELOAD_MS)) {
        resultsLoadedAt = Date.now()
        const results = await resultRepository.getResults(competitionId)
        if (disposed) return
        if (results.kind === 'success') {
          resultTimes = new Map(
            results.data.map((r) => [
              r.participantId,
              { start: r.startTime && r.startTime > 0 ? r.startTime : null, finish: r.finishTime && r.finishTime > 0 ? r.finishTime : null },
            ]),
          )
        }
      }
      // Перезапуски трека одним участником показываем как один трек.
      const tracks = mergedByParticipant(accumulator.list())
      for (const track of [...tracks].sort((a, b) => a.startedAt - b.startedAt)) {
        if (!colors.has(track.sessionId)) colors.set(track.sessionId, colors.size)
      }
      const speedProfiles = new Map<string, TrackSpeedProfile>()
      for (const track of tracks) {
        if (isActive(track)) continue
        const key = `${track.points.length}:${track.points[0]?.t}:${track.points[track.points.length - 1]?.t}`
        let cached = speedCache.get(track.sessionId)
        if (cached?.key !== key) {
          cached = { key, profile: speedProfile(track) }
          speedCache.set(track.sessionId, cached)
        }
        if (cached.profile) speedProfiles.set(track.sessionId, cached.profile)
      }
      const replayTracks = new Map<string, ReplayTrack>()
      for (const track of tracks) {
        if (isActive(track)) continue
        const times = resultTimes.get(track.participantId)
        const replay = toReplay(track, times?.start ?? null, times?.finish ?? null)
        if (replay) replayTracks.set(track.sessionId, replay)
      }
      setState({
        loaded: true,
        tracks,
        colorIndex: new Map(colors),
        serverTime: accumulator.serverTime || Date.now(),
        connectionLost: !ok,
        speedProfiles,
        replayTracks,
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

/** Темп «М:СС /км» по скорости в м/с. */
function paceText(speed: number): string {
  if (speed < STANDING_SPEED) return 'стоит'
  const totalSeconds = Math.floor(1000 / speed)
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')} /км`
}

/** Время суток «ЧЧ:ММ:СС». */
function clockText(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Длительность «М:СС» или «Ч:ММ:СС». */
function durationText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`
}

/** Состояние участника в момент просмотра для списка. */
function replayStatusText(replay: ReplayTrack, position: number, mode: ReplayTimeMode): string {
  const t = replayTimeAt(replay, position, mode)
  switch (replayPositionAt(replay, t).state) {
    case 'notStarted':
      return `старт ${clockText(replay.startAt)}`
    case 'finished':
      return `финиш ${durationText(replay.finishAt - replay.startAt)}`
    case 'noData':
      return `${durationText(t - replay.startAt)} • нет данных`
    case 'running':
      return durationText(t - replay.startAt)
  }
}

/** Шкала скорости поверх карты; темп на концах подписан, только когда раскрашен один трек. */
function SpeedLegend({ profile, hint }: { profile: TrackSpeedProfile | null; hint: boolean }) {
  const gradient = Array.from({ length: SPEED_COLOR_STEPS }, (_, i) => speedColor(i, SPEED_COLOR_STEPS)).join(', ')
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs text-fg shadow">
      <div className="h-2 w-42 rounded" style={{ background: `linear-gradient(to right, ${gradient})` }} />
      <div className="flex w-42 justify-between">
        <span>{profile ? paceText(profile.slowSpeed) : 'медленнее'}</span>
        <span>{profile ? paceText(profile.fastSpeed) : 'быстрее'}</span>
      </div>
      {hint && <div className="text-on-surface-variant">Нажмите на участника — только его трек</div>}
    </div>
  )
}

/**
 * Карта онлайн-треков дистанции для зрителя: растр карты по трём углам, КП, треки участников,
 * фильтр по группам, «хвост 5 мин» и список участников (клик — центрировать карту). Публичная.
 * Завершённые треки можно раскрасить по скорости участника (красный — медленно, зелёный — быстро):
 * в этом режиме клик по участнику оставляет на карте только его трек. «Просмотр» — ползунок и ▶:
 * маркеры движутся по трекам от старта до финиша по общим часам или с общего старта; галочки в
 * списке оставляют на карте только отмеченных.
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

  const { loaded, tracks, colorIndex, serverTime, connectionLost, speedProfiles, replayTracks } = useLiveTracks(competitionId, distanceId)

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [tailOnly, setTailOnly] = useState(false)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [speedMode, setSpeedMode] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [replay, setReplay] = useState(false)
  const [replayMode, setReplayMode] = useState<ReplayTimeMode>('mass')
  const [replayPosition, setReplayPosition] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(DEFAULT_PLAYBACK_SPEED)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const groups = [...new Set(tracks.map((t) => t.groupName).filter((g): g is string => g != null))].sort()
  const visibleTracks = selectedGroups.size === 0 ? tracks : tracks.filter((t) => t.groupName != null && selectedGroups.has(t.groupName))
  const activeCount = tracks.filter(isActive).length
  const canShowSpeed = visibleTracks.some((t) => speedProfiles.has(t.sessionId))
  const canReplay = visibleTracks.some((t) => replayTracks.has(t.sessionId))
  // Треки просмотра: завершённые показанные, а если кто-то отмечен — только отмеченные. Memo — чтобы
  // бледные треки на карте не перестраивались на каждом кадре.
  const replayShown = useMemo(() => {
    const finished = tracks
      .filter((t) => selectedGroups.size === 0 || (t.groupName != null && selectedGroups.has(t.groupName)))
      .flatMap((t) => replayTracks.get(t.sessionId) ?? [])
    const checked = finished.filter((r) => checkedIds.has(r.track.sessionId))
    return checked.length > 0 ? checked : finished
  }, [tracks, replayTracks, selectedGroups, checkedIds])
  const range = replayRange(replayShown, replayMode)
  // Диапазон меняется при смене галочек и групп — позиция держится в его пределах.
  const position = range ? Math.min(Math.max(replayPosition, range[0]), range[1]) : 0
  const rangeEnd = range?.[1] ?? null
  // Выбранный в режиме скорости участник, если он не скрыт фильтром групп (при просмотре — не используется).
  const speedSelection = speedMode && !replay ? (visibleTracks.find((t) => t.sessionId === selectedSessionId) ?? null) : null
  const mapTracks = replay ? replayShown.map((r) => r.track) : speedSelection ? [speedSelection] : visibleTracks
  const listTracks = replay ? visibleTracks.filter((t) => replayTracks.has(t.sessionId)) : visibleTracks

  useEffect(() => {
    if (!isPlaying || rangeEnd == null) return
    const timer = setInterval(() => {
      setReplayPosition((prev) => {
        const next = prev + REPLAY_FRAME_MS * playbackSpeed
        if (next >= rangeEnd) setIsPlaying(false)
        return Math.min(next, rangeEnd)
      })
    }, REPLAY_FRAME_MS)
    return () => clearInterval(timer)
  }, [isPlaying, playbackSpeed, rangeEnd])
  const coloredProfiles = speedMode ? mapTracks.filter((t) => !isActive(t)).flatMap((t) => speedProfiles.get(t.sessionId) ?? []) : []

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
    const replayTrack = replay ? replayTracks.get(track.sessionId) : undefined
    if (replayTrack) {
      const { point } = replayPositionAt(replayTrack, replayTimeAt(replayTrack, position, replayMode))
      setFocus((prev) => ({ lat: point.lat, lon: point.lon, bounds: null, seq: (prev?.seq ?? 0) + 1 }))
    } else if (speedMode) {
      const deselect = selectedSessionId === track.sessionId
      setSelectedSessionId(deselect ? null : track.sessionId)
      if (deselect || !last) return
      const bounds = track.points.map((p) => [p.lat, p.lon] as [number, number])
      setFocus((prev) => ({ lat: last.lat, lon: last.lon, bounds, seq: (prev?.seq ?? 0) + 1 }))
    } else if (last) {
      setFocus((prev) => ({ lat: last.lat, lon: last.lon, bounds: null, seq: (prev?.seq ?? 0) + 1 }))
    }
  }

  function toggleSpeedMode() {
    setSpeedMode((v) => !v)
    setSelectedSessionId(null)
  }

  function toggleReplay() {
    setIsPlaying(false)
    setReplay((v) => !v)
    setReplayPosition(range?.[0] ?? 0)
  }

  function changeReplayMode(mode: ReplayTimeMode) {
    setIsPlaying(false)
    setReplayMode(mode)
    setReplayPosition(replayRange(replayShown, mode)?.[0] ?? 0)
  }

  function togglePlay() {
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    if (!range) return
    // С начала, если ползунок в конце.
    setReplayPosition(position >= range[1] ? range[0] : position)
    setIsPlaying(true)
  }

  function toggleChecked(sessionId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const chipClass = (selected: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-sm ${selected ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'}`

  return (
    <div className="live-track-layout h-dvh bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3 [grid-area:header]">
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

      <div className="flex gap-2 overflow-x-auto px-4 py-2 [grid-area:filters]">
        {!replay && (
          <button type="button" onClick={() => setTailOnly((v) => !v)} className={chipClass(tailOnly)}>
            Хвост 5 мин
          </button>
        )}
        {(canReplay || replay) && (
          <button type="button" onClick={toggleReplay} className={chipClass(replay)}>
            Просмотр
          </button>
        )}
        {(canShowSpeed || speedMode) && (
          <button type="button" onClick={toggleSpeedMode} className={chipClass(speedMode)}>
            Скорость
          </button>
        )}
        {groups.map((group) => (
          <button key={group} type="button" onClick={() => toggleGroup(group)} className={chipClass(selectedGroups.has(group))}>
            {group}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 [grid-area:map] landscape-wide:border-l landscape-wide:border-outline-variant">
        {distances ? (
          <LiveTrackMapView
            mapUrl={distance?.mapUrl ?? null}
            corners={corners}
            controlPoints={controlPoints}
            tracks={mapTracks}
            colorIndex={colorIndex}
            serverTime={serverTime}
            tailOnly={tailOnly}
            speedProfiles={speedMode ? speedProfiles : null}
            replay={replay ? { tracks: replayShown, position, mode: replayMode } : null}
            focus={focus}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loading />
          </div>
        )}
        {speedMode && canShowSpeed && (
          <SpeedLegend profile={coloredProfiles.length === 1 ? coloredProfiles[0] : null} hint={!speedSelection && coloredProfiles.length !== 1} />
        )}
      </div>

      {replay && range && (
        <div className="flex items-center gap-2 border-t border-outline-variant px-2 pt-1 [grid-area:controls] landscape-wide:border-l landscape-wide:py-1">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-fg"
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <input
            type="range"
            min={range[0]}
            max={range[1]}
            value={position}
            onChange={(e) => setReplayPosition(Number(e.target.value))}
            aria-label="Момент просмотра"
            className="min-w-0 flex-1 accent-primary"
          />
          <span className="w-20 shrink-0 text-right text-sm tabular-nums">
            {replayMode === 'real' ? clockText(position) : `+${durationText(position)}`}
          </span>
        </div>
      )}

      {replay && range && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 [grid-area:options]">
          <button type="button" onClick={() => changeReplayMode('mass')} className={chipClass(replayMode === 'mass')}>
            Общий старт
          </button>
          <button type="button" onClick={() => changeReplayMode('real')} className={chipClass(replayMode === 'real')}>
            Реальное время
          </button>
          {PLAYBACK_SPEEDS.map((speed) => (
            <button key={speed} type="button" onClick={() => setPlaybackSpeed(speed)} className={chipClass(playbackSpeed === speed)}>
              ×{speed}
            </button>
          ))}
        </div>
      )}

      <ul className="max-h-[38vh] min-h-0 overflow-y-auto border-t border-outline-variant [grid-area:list] landscape-wide:max-h-none">
        {listTracks.map((track) => {
          const stale = isStale(track, serverTime)
          const selected = speedSelection?.sessionId === track.sessionId
          const replayTrack = replay ? replayTracks.get(track.sessionId) : undefined
          return (
            <li key={track.sessionId} className={`flex items-center ${selected ? 'bg-secondary-container' : ''}`}>
              {replayTrack && (
                <input
                  type="checkbox"
                  checked={checkedIds.has(track.sessionId)}
                  onChange={() => toggleChecked(track.sessionId)}
                  aria-label={`Сравнивать: ${track.displayName}`}
                  className="ml-4 h-4 w-4 shrink-0 accent-primary"
                />
              )}
              <button type="button" onClick={() => focusTrack(track)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left">
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
                  {replayTrack ? replayStatusText(replayTrack, position, replayMode) : statusText(track, serverTime)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
