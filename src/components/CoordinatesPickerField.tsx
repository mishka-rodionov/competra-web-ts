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

/**
 * Поле координат старта: текущее значение + кнопка, открывающая MapPickerField в модалке.
 * Клик по карте только ставит пин (черновик) — в форму точка попадает по кнопке «Готово»,
 * чтобы пользователь успел увидеть, куда именно поставил пин, и при необходимости поправить.
 */
export function CoordinatesPickerField({ latitude, longitude, onPick }: CoordinatesPickerFieldProps) {
  const [draft, setDraft] = useState<[number, number] | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  function openPicker() {
    setDraft(latitude != null && longitude != null ? [latitude, longitude] : null)
    setShowPicker(true)
  }

  function confirm() {
    if (draft) onPick(draft[0], draft[1])
    setShowPicker(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-variant">Координаты старта</span>
      <span className="text-base text-fg">{latitude != null && longitude != null ? `${formatCoord(latitude)}, ${formatCoord(longitude)}` : 'Не указаны'}</span>
      <button type="button" onClick={openPicker} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        {latitude != null ? 'Изменить на карте' : 'Выбрать на карте'}
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-4">
            <MapPickerField
              latitude={draft?.[0] ?? null}
              longitude={draft?.[1] ?? null}
              onPick={(lat, lon) => setDraft([lat, lon])}
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setShowPicker(false)} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
                Отмена
              </button>
              <button
                type="button"
                disabled={!draft}
                onClick={confirm}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
