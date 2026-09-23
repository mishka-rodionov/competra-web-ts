import type { LatLngBoundsExpression } from 'leaflet'
import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { cornersToBounds, type MapCorners } from '../lib/mapCorners'
import { MapInvalidateSize } from './MapInvalidateSize'
import { RotatedImageOverlay } from './RotatedImageOverlay'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const BOUNDS_OPTIONS = { padding: [24, 24] as [number, number] }

interface DistanceMapViewProps {
  mapUrl: string
  corners: MapCorners
  className?: string
  /** Слои поверх карты (треки, маркеры) — рендерятся внутри `<MapContainer>`. */
  children?: ReactNode
}

/**
 * Карта дистанции: тайлы OSM, поверх — растровая карта соревнования (экспорт из mapper),
 * наложенная по её WGS84-углам через {@link RotatedImageOverlay} — так растр ложится верно и для
 * карт, повёрнутых на магнитное склонение (привязка по трём точкам), и для старых данных с
 * bbox «север вверх» (см. `distanceMapCorners`).
 *
 * Растягивается через `flex-1`, а не `h-full` (height:100%) — если родительская цепочка где-то
 * упирается в `min-height` (например, `min-h-screen` на уровне страницы) вместо `height`, проценты
 * не наследуются (CSS 2.1 §10.5) и карта рендерится 0×0, хотя обёртка видна на экране. `flex-1`
 * растягивает через кросс-ось flex-контейнера и этому ограничению не подчиняется.
 */
export function DistanceMapView({ mapUrl, corners, className, children }: DistanceMapViewProps) {
  const bounds: LatLngBoundsExpression = cornersToBounds(corners)

  return (
    <MapContainer bounds={bounds} boundsOptions={BOUNDS_OPTIONS} className={className ?? 'flex-1 w-full'}>
      <MapInvalidateSize bounds={bounds} boundsOptions={BOUNDS_OPTIONS} />
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <RotatedImageOverlay url={mapUrl} corners={corners} />
      {children}
    </MapContainer>
  )
}
