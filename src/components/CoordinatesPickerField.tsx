import { useState } from 'react'
import { MapPickerField } from './MapPickerField'

function formatCoord(value: number): string {
  return (Math.round(value * 100_000) / 100_000).toString()
}

interface CoordinatesPickerFieldProps {
  latitude: number | null
  longitude: number | null
  onPick: (latitude: number, longitude: number) => void
}

/** Поле координат старта: текущее значение + кнопка, открывающая MapPickerField в модалке. */
export function CoordinatesPickerField({ latitude, longitude, onPick }: CoordinatesPickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-variant">Координаты старта</span>
      <span className="text-base text-fg">{latitude != null && longitude != null ? `${formatCoord(latitude)}, ${formatCoord(longitude)}` : 'Не указаны'}</span>
      <button type="button" onClick={() => setShowPicker(true)} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        {latitude != null ? 'Изменить на карте' : 'Выбрать на карте'}
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-4">
            <MapPickerField
              latitude={latitude}
              longitude={longitude}
              onPick={(lat, lon) => {
                onPick(lat, lon)
                setShowPicker(false)
              }}
            />
            <button type="button" onClick={() => setShowPicker(false)} className="mt-3 w-full rounded-md border border-outline px-4 py-2 text-sm text-fg">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
