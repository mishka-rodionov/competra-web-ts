import { useState } from 'react'
import { Marker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { MapInvalidateSize } from './MapInvalidateSize'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const MOSCOW_LAT = 55.75222
const MOSCOW_LON = 37.61556
const DEFAULT_ZOOM = 14

function roundCoord(value: number): number {
  return Math.round(value * 100_000) / 100_000
}

function formatCoord(value: number): string {
  return roundCoord(value).toString()
}

function ClickToPick({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng))
    },
  })
  return null
}

interface MapPickerFieldProps {
  latitude: number | null
  longitude: number | null
  onPick: (latitude: number, longitude: number) => void
  className?: string
}

/**
 * Карта выбора координат старта: клик по карте ставит маркер и сразу сообщает координаты
 * наверх — проще, чем в старом приложении (там двигалась сама карта под неподвижным
 * перекрестием, а координаты фиксировались отдельной кнопкой), потому что Leaflet уже
 * поддерживает клик-по-карте "из коробки".
 */
export function MapPickerField({ latitude, longitude, onPick, className }: MapPickerFieldProps) {
  const [picked, setPicked] = useState<[number, number] | null>(latitude != null && longitude != null ? [latitude, longitude] : null)

  function handlePick(lat: number, lon: number) {
    setPicked([lat, lon])
    onPick(lat, lon)
  }

  return (
    <div className="flex flex-col gap-1">
      <MapContainer
        center={picked ?? [MOSCOW_LAT, MOSCOW_LON]}
        zoom={DEFAULT_ZOOM}
        className={className ?? 'h-72 w-full'}
      >
        <MapInvalidateSize />
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <ClickToPick onPick={handlePick} />
        {picked && <Marker position={picked} />}
      </MapContainer>
      <span className="text-sm text-on-surface-variant">{picked ? `${formatCoord(picked[0])}, ${formatCoord(picked[1])}` : 'Кликните на карте, чтобы выбрать точку старта'}</span>
    </div>
  )
}
