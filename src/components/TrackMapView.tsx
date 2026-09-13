import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet'
import type { TrackPoint } from '../lib/trackCodec'
import { MapInvalidateSize } from './MapInvalidateSize'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const BOUNDS_OPTIONS = { padding: [24, 24] as [number, number] }

/**
 * Неинтерактивная карта с треком тренировки: полилиния по GPS-точкам, старт зелёным, финиш красным.
 *
 * По умолчанию карта растягивается через `flex-1`, а НЕ через `h-full` (height:100%) — оборачивающий
 * блок этой страницы в итоге упирается в `min-h-screen` на самом верху дерева, а `min-height`
 * (в отличие от `height`) не считается «явно заданной» высотой для процентного наследования у
 * потомков (CSS 2.1 §10.5): результат рендерится как 0×0, хотя обёртка реально видна на экране.
 * `flex-1` работает через растяжение по кросс-оси flex-контейнера, а не через проценты, и этому
 * правилу не подчиняется.
 */
export function TrackMapView({ points, className }: { points: TrackPoint[]; className?: string }) {
  if (points.length === 0) return null

  const latLngs: LatLngExpression[] = points.map((p) => [p.lat, p.lon])
  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  const bounds: LatLngBoundsExpression = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ]

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={BOUNDS_OPTIONS}
      className={className ?? 'flex-1 w-full'}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      zoomControl={false}
    >
      <MapInvalidateSize bounds={bounds} boundsOptions={BOUNDS_OPTIONS} />
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <Polyline positions={latLngs} pathOptions={{ color: '#2962ff', weight: 4 }} />
      <CircleMarker center={latLngs[0]} radius={6} pathOptions={{ color: '#2e7d32', fillColor: '#2e7d32', fillOpacity: 1 }} />
      <CircleMarker center={latLngs[latLngs.length - 1]} radius={6} pathOptions={{ color: '#c62828', fillColor: '#c62828', fillOpacity: 1 }} />
    </MapContainer>
  )
}
