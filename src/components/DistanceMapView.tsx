import type { LatLngBoundsExpression } from 'leaflet'
import { ImageOverlay, MapContainer, TileLayer } from 'react-leaflet'
import { MapInvalidateSize } from './MapInvalidateSize'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const BOUNDS_OPTIONS = { padding: [24, 24] as [number, number] }

interface DistanceMapViewProps {
  mapUrl: string
  topLeftLat: number
  topLeftLng: number
  bottomRightLat: number
  bottomRightLng: number
  className?: string
}

/**
 * Карта дистанции: тайлы OSM, поверх — растровая карта соревнования (экспорт из mapper),
 * наложенная по её WGS84-углам. В старом приложении это рисовалось вручную на Canvas
 * (Compose/Wasm не даёт встраивать DOM-карты) — на вебе для этого есть Leaflet, который уже
 * умеет тайлы, растровый overlay и жесты «из коробки».
 *
 * Растягивается через `flex-1`, а не `h-full` (height:100%) — если родительская цепочка где-то
 * упирается в `min-height` (например, `min-h-screen` на уровне страницы) вместо `height`, проценты
 * не наследуются (CSS 2.1 §10.5) и карта рендерится 0×0, хотя обёртка видна на экране. `flex-1`
 * растягивает через кросс-ось flex-контейнера и этому ограничению не подчиняется.
 */
export function DistanceMapView({ mapUrl, topLeftLat, topLeftLng, bottomRightLat, bottomRightLng, className }: DistanceMapViewProps) {
  const bounds: LatLngBoundsExpression = [
    [Math.min(topLeftLat, bottomRightLat), Math.min(topLeftLng, bottomRightLng)],
    [Math.max(topLeftLat, bottomRightLat), Math.max(topLeftLng, bottomRightLng)],
  ]

  return (
    <MapContainer bounds={bounds} boundsOptions={BOUNDS_OPTIONS} className={className ?? 'flex-1 w-full'}>
      <MapInvalidateSize bounds={bounds} boundsOptions={BOUNDS_OPTIONS} />
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <ImageOverlay url={mapUrl} bounds={bounds} />
    </MapContainer>
  )
}
