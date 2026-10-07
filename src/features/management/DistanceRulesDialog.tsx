import { useState } from 'react'
import { distanceRepository } from '../../api/distanceRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { isRequiredControl, REQUIRED_ROLE } from '../../lib/controlPoints'
import type { ControlPoint, Distance } from '../../types/distance'

interface DistanceRulesDialogProps {
  distance: Distance
  /** «По выбору» с минимумом КП — кроме обязательных КП редактируется и минимум. */
  hasMinControls: boolean
  onDismiss: () => void
  onSaved: () => void
}

/**
 * Правила дистанции «по выбору», заданные после создания или импорта (например, если XML
 * подготовлен не в Mapper и правил в нём нет): обязательные КП и, для режима по количеству КП,
 * минимум. Остальные поля дистанции уходят как есть; карта и координаты старта/финиша не
 * передаются — сервер их тогда не трогает.
 */
export function DistanceRulesDialog({ distance, hasMinControls, onDismiss, onSaved }: DistanceRulesDialogProps) {
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>(distance.controlPoints)
  const [minControls, setMinControls] = useState(distance.minControlsCount?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleRequired(index: number) {
    setControlPoints((prev) =>
      prev.map((cp, i) => (i === index ? { ...cp, role: isRequiredControl(cp) ? 'ORDINARY' : REQUIRED_ROLE } : cp)),
    )
  }

  async function handleSave() {
    // Пусто и 0 — «все КП».
    const minControlsCount = parseInt(minControls, 10) || 0
    if (hasMinControls && minControlsCount > controlPoints.length) {
      setError(`На дистанции всего ${controlPoints.length} КП — минимум не может быть больше`)
      return
    }
    setSaving(true)
    setError(null)
    const result = await distanceRepository.saveDistances([
      {
        distanceId: distance.id,
        competitionId: distance.competitionId,
        name: distance.name,
        lengthMeters: distance.lengthMeters,
        climbMeters: distance.climbMeters,
        controlsCount: distance.controlsCount,
        description: distance.description ?? '',
        controlPoints,
        finishControlPoint: distance.finishControlPoint,
        startControlPoint: distance.startControlPoint,
        // Вне режима минимума поле не передаём — сервер сохранит значение из Mapper.
        ...(hasMinControls ? { minControlsCount } : {}),
      },
    ])
    setSaving(false)
    if (result.kind === 'success') {
      onSaved()
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Правила: {distance.name ?? 'дистанция'}</h3>
        <span className="text-sm text-on-surface-variant">Нажмите на КП, чтобы сделать его обязательным</span>
        <div className="flex flex-wrap gap-2">
          {controlPoints.map((cp, index) => (
            <button
              key={`${cp.number}-${index}`}
              type="button"
              onClick={() => toggleRequired(index)}
              className={`rounded-full border px-3 py-1 text-sm ${
                isRequiredControl(cp) ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'
              }`}
            >
              {cp.number}
            </button>
          ))}
        </div>
        {hasMinControls && (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Минимум КП</span>
            <input
              value={minControls}
              onChange={(e) => {
                setMinControls(e.target.value.replace(/\D/g, ''))
                setError(null)
              }}
              inputMode="numeric"
              className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
            />
            <span className="text-xs text-on-surface-variant">
              Пусто — все КП дистанции ({controlPoints.length}). Обязательные КП входят в это число
            </span>
          </label>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
