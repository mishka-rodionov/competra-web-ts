import { useState } from 'react'
import { parseControlPoints } from '../../lib/controlPoints'
import { isMinControls, ranksByScore } from '../../lib/byChoiceMode'
import type { PendingDistance } from './types'

interface DistanceDialogProps {
  direction: string
  /** SCORE / MIN_CONTROLS — в score-О у КП баллы, в «по выбору» с минимумом КП — минимум КП. */
  byChoiceMode: string
  /** Старт по стартовой станции: реальное время старта берётся из отметки на этом КП. */
  isStartCpRequired: boolean
  onDismiss: () => void
  onSave: (distance: PendingDistance) => void
}

export function DistanceDialog({ direction, byChoiceMode, isStartCpRequired, onDismiss, onSave }: DistanceDialogProps) {
  const isByChoice = direction === 'BY_CHOICE'
  const hasScores = ranksByScore(direction, byChoiceMode)
  const hasMinControls = isMinControls(direction, byChoiceMode)
  const [name, setName] = useState('')
  const [lengthMeters, setLengthMeters] = useState('')
  const [climbMeters, setClimbMeters] = useState('')
  const [controlPointsInput, setControlPointsInput] = useState('')
  const [finishCp, setFinishCp] = useState('')
  const [startCp, setStartCp] = useState('')
  const [showStartCpError, setShowStartCpError] = useState(false)
  const [description, setDescription] = useState('')
  const [minControls, setMinControls] = useState('')
  const [minControlsError, setMinControlsError] = useState<string | null>(null)

  function handleSave() {
    if (isStartCpRequired && !startCp) {
      setShowStartCpError(true)
      return
    }
    const controlPoints = parseControlPoints(controlPointsInput, isByChoice, hasScores)
    // Пусто и 0 — «все КП».
    const minControlsCount = hasMinControls ? parseInt(minControls, 10) || null : null
    if (minControlsCount != null && minControlsCount > controlPoints.length) {
      setMinControlsError(`На дистанции всего ${controlPoints.length} КП — минимум не может быть больше`)
      return
    }
    onSave({
      name: name.trim() || null,
      lengthMeters: parseInt(lengthMeters, 10) || 0,
      climbMeters: parseInt(climbMeters, 10) || 0,
      controlPoints,
      finishControlPoint: finishCp ? parseInt(finishCp, 10) : null,
      startControlPoint: isStartCpRequired && startCp ? parseInt(startCp, 10) : null,
      description: description.trim() || null,
      minControlsCount,
    })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Новая дистанция</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <div className="flex gap-2">
          <input
            value={lengthMeters}
            onChange={(e) => setLengthMeters(e.target.value.replace(/\D/g, ''))}
            placeholder="Длина (м)"
            inputMode="numeric"
            className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
          />
          <input
            value={climbMeters}
            onChange={(e) => setClimbMeters(e.target.value.replace(/\D/g, ''))}
            placeholder="Набор (м)"
            inputMode="numeric"
            className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
          />
        </div>
        <input
          value={controlPointsInput}
          onChange={(e) => setControlPointsInput(e.target.value)}
          placeholder={hasScores ? '31:2 32:5 33:3 34' : hasMinControls ? '31* 32 33 34 (КП через пробел)' : '31 32 33 34 (КП через пробел)'}
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        {hasScores && (
          <p className="text-sm text-on-surface-variant">
            Формат «по выбору»: номер:баллы (например 32:5). Без баллов — по умолчанию 2. Звёздочка — обязательный КП (32:5*).
          </p>
        )}
        {hasMinControls && (
          <>
            <p className="text-sm text-on-surface-variant">Звёздочка после номера — обязательный КП (31*).</p>
            <div className="flex flex-col gap-1">
              <input
                value={minControls}
                onChange={(e) => {
                  setMinControls(e.target.value.replace(/\D/g, ''))
                  setMinControlsError(null)
                }}
                placeholder="Минимум КП"
                inputMode="numeric"
                className={`rounded-md border bg-bg px-3 py-2 text-fg ${minControlsError ? 'border-error' : 'border-outline'}`}
              />
              <p className={`text-sm ${minControlsError ? 'text-error' : 'text-on-surface-variant'}`}>
                {minControlsError ?? 'Сколько КП нужно взять. Пусто — все КП дистанции. Обязательные КП входят в это число'}
              </p>
            </div>
          </>
        )}
        <input
          value={finishCp}
          onChange={(e) => setFinishCp(e.target.value.replace(/\D/g, ''))}
          placeholder="Финишное КП"
          inputMode="numeric"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        {isStartCpRequired && (
          <div className="flex flex-col gap-1">
            <input
              value={startCp}
              onChange={(e) => {
                setStartCp(e.target.value.replace(/\D/g, ''))
                setShowStartCpError(false)
              }}
              placeholder="Стартовое КП *"
              inputMode="numeric"
              className={`rounded-md border bg-bg px-3 py-2 text-fg ${showStartCpError ? 'border-error' : 'border-outline'}`}
            />
            <p className={`text-sm ${showStartCpError ? 'text-error' : 'text-on-surface-variant'}`}>
              {showStartCpError
                ? 'Укажите номер стартового КП — по нему определяется реальное время старта'
                : 'Номер КП на стартовой станции — по нему рассчитывается время старта'}
            </p>
          </div>
        )}
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
