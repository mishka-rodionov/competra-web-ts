import { useState } from 'react'
import { distanceRepository } from '../../api/distanceRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { Distance } from '../../types/distance'

interface AttachMapDialogProps {
  distance: Distance
  onDismiss: () => void
  onSaved: (distance: Distance) => void
}

/** Ключи, которые mapper кладёт в буфер обмена («Copy WGS84 map corners for Competra»). */
type CornerKey = 'mapTopLeftLat' | 'mapTopLeftLng' | 'mapTopRightLat' | 'mapTopRightLng' | 'mapBottomRightLat' | 'mapBottomRightLng'

const CORNER_KEYS: CornerKey[] = ['mapTopLeftLat', 'mapTopLeftLng', 'mapTopRightLat', 'mapTopRightLng', 'mapBottomRightLat', 'mapBottomRightLng']

const REQUIRED_CORNER_KEYS: CornerKey[] = ['mapTopLeftLat', 'mapTopLeftLng', 'mapBottomRightLat', 'mapBottomRightLng']

const CORNER_LABELS: Record<CornerKey, string> = {
  mapTopLeftLat: 'Top-left lat',
  mapTopLeftLng: 'Top-left lng',
  mapTopRightLat: 'Top-right lat',
  mapTopRightLng: 'Top-right lng',
  mapBottomRightLat: 'Bottom-right lat',
  mapBottomRightLng: 'Bottom-right lng',
}

/**
 * Разбирает текст из буфера обмена mapper'а (`ключ=значение` построчно) — только известные
 * ключи и только числа; остальное молча игнорируется.
 */
function parseMapperCorners(text: string): Partial<Record<CornerKey, string>> {
  const parsed: Partial<Record<CornerKey, string>> = {}
  for (const line of text.split(/\r?\n/)) {
    const [rawKey, rawValue] = line.split('=')
    const key = rawKey?.trim() as CornerKey
    const value = rawValue?.trim()
    if (CORNER_KEYS.includes(key) && value && !Number.isNaN(Number(value))) parsed[key] = value
  }
  return parsed
}

/**
 * Диалог прикрепления карты дистанции: организатор выбирает растр, экспортированный из mapper, и
 * указывает углы. Mapper («Copy WGS84 map corners for Competra» в диалоге экспорта) копирует в
 * буфер три точных угла — верхний левый, верхний правый и нижний правый; текст можно вставить
 * целиком, поля заполнятся сами.
 *
 * Верхний правый угол необязателен: без него (старые экспорты mapper) углы трактуются как bbox
 * «север вверх», и повёрнутая карта ляжет со сдвигом.
 */
export function AttachMapDialog({ distance, onDismiss, onSaved }: AttachMapDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [corners, setCorners] = useState<Record<CornerKey, string>>(() => ({
    mapTopLeftLat: distance.mapTopLeftLat?.toString() ?? '',
    mapTopLeftLng: distance.mapTopLeftLng?.toString() ?? '',
    mapTopRightLat: distance.mapTopRightLat?.toString() ?? '',
    mapTopRightLng: distance.mapTopRightLng?.toString() ?? '',
    mapBottomRightLat: distance.mapBottomRightLat?.toString() ?? '',
    mapBottomRightLng: distance.mapBottomRightLng?.toString() ?? '',
  }))
  const [mapperText, setMapperText] = useState('')
  const [pasteStatus, setPasteStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Object.fromEntries(CORNER_KEYS.map((key) => [key, corners[key] ? Number(corners[key]) : NaN])) as Record<CornerKey, number>
  const hasTopRight = corners.mapTopRightLat !== '' || corners.mapTopRightLng !== ''
  const invalidKeys = (hasTopRight ? CORNER_KEYS : REQUIRED_CORNER_KEYS).filter((key) => Number.isNaN(parsed[key]))
  const canSave = invalidKeys.length === 0 && (file != null || distance.mapUrl != null)

  const missing = [file == null && distance.mapUrl == null ? 'файл карты' : null, ...invalidKeys.map((key) => CORNER_LABELS[key].toLowerCase())].filter(
    (v): v is string => v != null,
  )

  function setCorner(key: CornerKey, value: string) {
    setCorners((prev) => ({ ...prev, [key]: value }))
  }

  /** Разбирает текст из mapper и заполняет углы; возвращает, удалось ли найти координаты. */
  function applyMapperText(text: string): boolean {
    const fromMapper = parseMapperCorners(text)
    if (!REQUIRED_CORNER_KEYS.every((key) => fromMapper[key] != null)) return false
    // Текст из mapper заменяет все углы целиком — иначе при вставке старого экспорта (4 значения,
    // без верхнего правого) в форме остался бы верхний правый угол от предыдущей привязки.
    setCorners(Object.fromEntries(CORNER_KEYS.map((key) => [key, fromMapper[key] ?? ''])) as Record<CornerKey, string>)
    const isRotated = fromMapper.mapTopRightLat != null && fromMapper.mapTopRightLng != null
    setPasteStatus({
      kind: 'success',
      message: isRotated
        ? 'Координаты вставлены: три угла карты.'
        : 'Координаты вставлены, но это старый формат mapper (без верхнего правого угла) — повёрнутая карта ляжет со сдвигом. Обновите mapper.',
    })
    return true
  }

  function handleMapperText(text: string) {
    setMapperText(text)
    if (!applyMapperText(text)) setPasteStatus(null)
  }

  /**
   * Читает буфер обмена одним нажатием. Браузер может отказать (нет разрешения, не HTTPS,
   * старый Firefox) — тогда подсказываем вставить текст в поле вручную.
   */
  async function handlePasteFromClipboard() {
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      setPasteStatus({ kind: 'error', message: 'Браузер не дал прочитать буфер обмена — вставьте текст в поле ниже (Ctrl+V / ⌘V).' })
      return
    }
    setMapperText(text)
    if (!applyMapperText(text)) {
      setPasteStatus({
        kind: 'error',
        message: 'В буфере обмена нет координат из mapper. В mapper включите «Copy WGS84 map corners for Competra» при экспорте и нажмите «Copy».',
      })
    }
  }

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
        // Бэкенд перезаписывает поле целиком — без него стартовое КП обнулилось бы при привязке карты.
        startControlPoint: distance.startControlPoint,
        mapUrl,
        mapTopLeftLat: parsed.mapTopLeftLat,
        mapTopLeftLng: parsed.mapTopLeftLng,
        // null (а не NaN) — пустой верхний правый угол означает привязку bbox «север вверх».
        mapTopRightLat: hasTopRight ? parsed.mapTopRightLat : null,
        mapTopRightLng: hasTopRight ? parsed.mapTopRightLng : null,
        mapBottomRightLat: parsed.mapBottomRightLat,
        mapBottomRightLng: parsed.mapBottomRightLng,
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

  const inputClass = 'w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg'

  function cornerRow(latKey: CornerKey, lngKey: CornerKey) {
    return (
      <div className="flex gap-2">
        <input value={corners[latKey]} onChange={(e) => setCorner(latKey, e.target.value)} placeholder={CORNER_LABELS[latKey]} className={inputClass} />
        <input value={corners[lngKey]} onChange={(e) => setCorner(lngKey, e.target.value)} placeholder={CORNER_LABELS[lngKey]} className={inputClass} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
      <div className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4">
        <h3 className="text-lg font-medium text-fg">Карта дистанции «{distance.name ?? 'Без названия'}»</h3>
        <p className="text-sm text-on-surface-variant">
          Загружайте карту после окончания соревнования — иначе участники смогут увидеть её до старта.
        </p>

        <label className="cursor-pointer rounded-md border border-outline px-4 py-2 text-center text-sm text-fg">
          {file ? `Выбран файл: ${file.name}` : 'Выбрать файл карты (PNG/JPG)'}
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <p className="text-sm text-fg">
          Координаты углов: в mapper при экспорте карты включите «Copy WGS84 map corners for Competra», нажмите «Copy» в появившемся окне, затем здесь —
          «Вставить из mapper».
        </p>
        <button type="button" onClick={handlePasteFromClipboard} className="rounded-md bg-secondary-container px-4 py-2 text-sm font-medium text-on-secondary-container">
          Вставить из mapper
        </button>
        {pasteStatus && <p className={`text-sm ${pasteStatus.kind === 'success' ? 'text-primary' : 'text-error'}`}>{pasteStatus.message}</p>}
        <textarea
          rows={3}
          value={mapperText}
          onChange={(e) => handleMapperText(e.target.value)}
          placeholder={'…или вставьте текст из mapper сюда:\nmapTopLeftLat=…\nmapTopLeftLng=…'}
          className="rounded-md border border-outline bg-bg px-3 py-2 font-mono text-xs text-fg"
        />

        <p className="text-xs text-on-surface-variant">
          …или заполните вручную. Верхний правый угол нужен для повёрнутых карт — без него карта ляжет «севером вверх».
        </p>
        {cornerRow('mapTopLeftLat', 'mapTopLeftLng')}
        {cornerRow('mapTopRightLat', 'mapTopRightLng')}
        {cornerRow('mapBottomRightLat', 'mapBottomRightLng')}

        {!canSave && missing.length > 0 && <p className="text-sm text-error">Не хватает: {missing.join(', ')}</p>}

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
