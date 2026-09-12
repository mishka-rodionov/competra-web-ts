import { useState } from 'react'
import { parseControlPoints } from '../../lib/controlPoints'
import type { PendingDistance } from './types'

interface DistanceDialogProps {
  isByChoice: boolean
  onDismiss: () => void
  onSave: (distance: PendingDistance) => void
}

export function DistanceDialog({ isByChoice, onDismiss, onSave }: DistanceDialogProps) {
  const [name, setName] = useState('')
  const [lengthMeters, setLengthMeters] = useState('')
  const [climbMeters, setClimbMeters] = useState('')
  const [controlPointsInput, setControlPointsInput] = useState('')
  const [finishCp, setFinishCp] = useState('')
  const [description, setDescription] = useState('')

  function handleSave() {
    const controlPoints = parseControlPoints(controlPointsInput, isByChoice)
    onSave({
      name: name.trim() || null,
      lengthMeters: parseInt(lengthMeters, 10) || 0,
      climbMeters: parseInt(climbMeters, 10) || 0,
      controlPoints,
      finishControlPoint: finishCp ? parseInt(finishCp, 10) : null,
      description: description.trim() || null,
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
          placeholder={isByChoice ? '31:2 32:5 33:3 34' : '31 32 33 34 (КП через пробел)'}
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        {isByChoice && (
          <p className="text-sm text-on-surface-variant">
            Формат «по выбору»: номер:баллы (например 32:5). Без баллов — по умолчанию 2.
          </p>
        )}
        <input
          value={finishCp}
          onChange={(e) => setFinishCp(e.target.value.replace(/\D/g, ''))}
          placeholder="Финишное КП"
          inputMode="numeric"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
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
