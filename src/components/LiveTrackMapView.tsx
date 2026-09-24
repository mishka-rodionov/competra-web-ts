import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { isActive, isStale, trackSegments, type ViewerTrack } from '../lib/liveTrackAccumulator'
import { CONTROL_POINT_COLOR, STALE_COLOR, TAIL_WINDOW_MS, trackColor } from '../lib/liveTrackColors'
import type { MapCorners } from '../lib/mapCorners'
import type { ControlPoint } from '../types/distance'
import { DistanceMapView } from './DistanceMapView'
import { MapInvalidateSize } from './MapInvalidateSize'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const BOUNDS_OPTIONS = { padding: [24, 24] as [number, number] }

interface LiveTrackMapViewProps {
  mapUrl: string | null
  corners: MapCorners | null
  controlPoints: ControlPoint[]
  tracks: ViewerTrack[]
  colorIndex: Map<string, number>
  serverTime: number
  tailOnly: boolean
  /** Участник, на котором центрировать карту; `seq` меняется на каждый запрос. */
  focus: { lat: number; lon: number; seq: number } | null
  className?: string
}

/**
 * Карта онлайн-треков дистанции: растр карты по её углам поверх OSM (или только OSM, если карта не
 * прикреплена), КП, треки участников (разрывы дольше 30 с не соединяются) и маркер с номером на
 * последней точке — серый, если данных нет больше минуты, полупрозрачный — трек закрыт.
 */
export function LiveTrackMapView(props: LiveTrackMapViewProps) {
  const layers = <TrackLayers {...props} />
  if (props.mapUrl && props.corners) {
    return (
      <DistanceMapView mapUrl={props.mapUrl} corners={props.corners} className={props.className}>
        {layers}
      </DistanceMapView>
    )
  }
  return (
    <MapContainer center={[55.75, 37.62]} zoom={13} className={props.className ?? 'flex-1 w-full'}>
      <MapInvalidateSize />
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <FitOnce controlPoints={props.controlPoints} tracks={props.tracks} />
      {layers}
    </MapContainer>
  )
}

function TrackLayers({ controlPoints, tracks, colorIndex, serverTime, tailOnly, focus }: LiveTrackMapViewProps) {
  return (
    <>
      {controlPoints.map((cp) =>
        cp.latitude != null && cp.longitude != null
          ? (cp.role.toUpperCase() === 'FINISH' ? [22, 32] : [30]).map((radius) => (
              <Circle
                key={`${cp.number}-${radius}`}
                center={[cp.latitude!, cp.longitude!]}
                radius={radius}
                pathOptions={{ color: CONTROL_POINT_COLOR, weight: 3, fill: false }}
              />
            ))
          : null,
      )}
      {tracks.map((track) => {
        const color = trackColor(colorIndex, track.sessionId)
        const since = tailOnly ? (track.lastPointAt ?? serverTime) - TAIL_WINDOW_MS : null
        const last = track.points[track.points.length - 1]
        return (
          <TrackLayer key={track.sessionId} track={track} color={color} since={since} serverTime={serverTime} last={last} />
        )
      })}
      <FlyToFocus focus={focus} />
    </>
  )
}

function TrackLayer({
  track,
  color,
  since,
  serverTime,
  last,
}: {
  track: ViewerTrack
  color: string
  since: number | null
  serverTime: number
  last: { lat: number; lon: number } | undefined
}) {
  const stale = isStale(track, serverTime)
  return (
    <>
      {trackSegments(track, since)
        .filter((segment) => segment.length > 1)
        .map((segment, i) => (
          <Polyline key={i} positions={segment.map((p) => [p.lat, p.lon])} pathOptions={{ color, weight: 4, lineCap: 'round' }} />
        ))}
      {last && (
        <Marker
          position={[last.lat, last.lon]}
          icon={markerIcon(stale ? STALE_COLOR : color, track.startNumber?.toString() ?? track.displayName.slice(0, 1), !isActive(track))}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {track.displayName}
            {track.groupName ? ` • ${track.groupName}` : ''}
          </Tooltip>
        </Marker>
      )}
    </>
  )
}

/** Кружок цвета участника с номером (divIcon — без картинок маркеров Leaflet). */
function markerIcon(color: string, label: string, faded: boolean): L.DivIcon {
  const safeLabel = label.replace(/[<>&"]/g, '')
  return L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html:
      `<div style="width:26px;height:26px;border-radius:50%;background:${color};opacity:${faded ? 0.6 : 1};` +
      `border:2px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font:700 ${safeLabel.length > 2 ? 10 : 12}px sans-serif">${safeLabel}</div>`,
  })
}

/** Без карты дистанции — вписать вид в КП или треки один раз, как только они появятся. */
function FitOnce({ controlPoints, tracks }: { controlPoints: ControlPoint[]; tracks: ViewerTrack[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    const cpPoints = controlPoints.filter((cp) => cp.latitude != null && cp.longitude != null).map((cp) => [cp.latitude!, cp.longitude!] as [number, number])
    const points = cpPoints.length > 1 ? cpPoints : tracks.flatMap((t) => t.points.map((p) => [p.lat, p.lon] as [number, number]))
    if (points.length < 2) return
    fitted.current = true
    map.fitBounds(points, BOUNDS_OPTIONS)
  }, [map, controlPoints, tracks])
  return null
}

function FlyToFocus({ focus }: { focus: LiveTrackMapViewProps['focus'] }) {
  const map = useMap()
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 15))
  }, [map, focus])
  return null
}
