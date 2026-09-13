import { useState } from 'react'
import { distanceRepository } from '../../api/distanceRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { Distance } from '../../types/distance'

interface AttachMapDialogProps {
  distance: Distance
  onDismiss: () => void
  onSaved: (distance: Distance) => void
}

/**
 * Диалог прикрепления карты дистанции: организатор выбирает растр, экспортированный из
 * mapper (кнопка «Copy WGS84 map corners for Competra» в диалоге экспорта копирует 4 нужных
 * числа в буфер обмена), и вводит координаты его углов вручную.
 */
export function AttachMapDialog({ distance, onDismiss, onSaved }: AttachMapDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [topLeftLat, setTopLeftLat] = useState(distance.mapTopLeftLat?.toString() ?? '')
  const [topLeftLng, setTopLeftLng] = useState(distance.mapTopLeftLng?.toString() ?? '')
  const [bottomRightLat, setBottomRightLat] = useState(distance.mapBottomRightLat?.toString() ?? '')
  const [bottomRightLng, setBottomRightLng] = useState(distance.mapBottomRightLng?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedTopLeftLat = topLeftLat ? Number(topLeftLat) : NaN
  const parsedTopLeftLng = topLeftLng ? Number(topLeftLng) : NaN
  const parsedBottomRightLat = bottomRightLat ? Number(bottomRightLat) : NaN
  const parsedBottomRightLng = bottomRightLng ? Number(bottomRightLng) : NaN
  const coordsValid = [parsedTopLeftLat, parsedTopLeftLng, parsedBottomRightLat, parsedBottomRightLng].every((v) => !Number.isNaN(v))
  const canSave = coordsValid && (file != null || distance.mapUrl != null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    let mapUrl = distance.mapUrl
    if (file) {
      const uploadResult = await distanceRepository.uploadDistanceMap(file)
      if (uploadResult.kind === 'error') {
        setError(uploadResult.message)
        setSaving(false)
        return
      }
      mapUrl = uploadResult.data
    }

    const result = await distanceRepository.saveDistances([
      {
        distanceId: distance.id,
        competitionId: distance.competitionId,
        name: distance.name,
        lengthMeters: distance.lengthMeters,
        climbMeters: distance.climbMeters,
        controlsCount: distance.controlsCount,
        description: distance.description ?? '',
        controlPoints: distance.controlPoints,
        finishControlPoint: distance.finishControlPoint,
        mapUrl,
        mapTopLeftLat: parsedTopLeftLat,
        mapTopLeftLng: parsedTopLeftLng,
        mapBottomRightLat: parsedBottomRightLat,
        mapBottomRightLng: parsedBottomRightLng,
      },
    ])
    if (result.kind === 'success') {
      const saved = result.data[0]
      if (saved) onSaved(saved)
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-surface p-4">
        <h3 className="text-lg font-medium text-fg">Карта дистанции «{distance.name ?? 'Без названия'}»</h3>
        <p className="text-sm text-on-surface-variant">
          Загружайте карту после окончания соревнования — иначе участники смогут увидеть её до старта.
        </p>

        <label className="cursor-pointer rounded-md border border-outline px-4 py-2 text-center text-sm text-fg">
          {file ? `Выбран файл: ${file.name}` : 'Выбрать файл карты (PNG/JPG)'}
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <p className="text-sm text-fg">Координаты углов (из диалога экспорта в mapper — «Copy WGS84 map corners for Competra»):</p>
        <div className="flex gap-2">
          <input value={topLeftLat} onChange={(e) => setTopLeftLat(e.target.value)} placeholder="Top-left lat" className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg" />
          <input value={topLeftLng} onChange={(e) => setTopLeftLng(e.target.value)} placeholder="Top-left lng" className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg" />
        </div>
        <div className="flex gap-2">
          <input value={bottomRightLat} onChange={(e) => setBottomRightLat(e.target.value)} placeholder="Bottom-right lat" className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg" />
          <input value={bottomRightLng} onChange={(e) => setBottomRightLng(e.target.value)} placeholder="Bottom-right lng" className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg" />
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} disabled={saving} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50">
            Отмена
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !canSave} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
