import { useState } from 'react'
import { distanceRepository } from '../../api/distanceRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LabeledSelect } from '../../components/LabeledSelect'
import {
  distanceFormatFields,
  distanceFormatOption,
  distanceFormatOptions,
  effectiveFormat,
  formatRanksByScore,
  INHERIT_FORMAT,
  type CourseFormat,
} from '../../lib/courseFormat'
import type { Distance } from '../../types/distance'

interface DistanceFormatDialogProps {
  distance: Distance
  /** Формат соревнования по умолчанию. */
  competitionFormat: CourseFormat
  onDismiss: () => void
  onSaved: () => void
}

/**
 * Формат уже сохранённой дистанции (например, импортированной из IOF XML): свой или как у
 * соревнования. Остальные поля уходят как есть; карта и координаты не передаются — сервер их не
 * трогает. Сервер пересчитывает места групп этой дистанции.
 */
export function DistanceFormatDialog({ distance, competitionFormat, onDismiss, onSaved }: DistanceFormatDialogProps) {
  const [option, setOption] = useState(distanceFormatOption(distance, competitionFormat))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fields = distanceFormatFields(option)
  const format = effectiveFormat(fields, competitionFormat)

  async function handleSave() {
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
        controlPoints: distance.controlPoints,
        finishControlPoint: distance.finishControlPoint,
        startControlPoint: distance.startControlPoint,
        direction: fields.direction ?? INHERIT_FORMAT,
        byChoiceMode: fields.byChoiceMode ?? INHERIT_FORMAT,
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
        <h3 className="text-lg font-medium text-fg">Формат: {distance.name ?? 'дистанция'}</h3>
        <LabeledSelect
          label="Формат дистанции"
          value={option}
          options={distanceFormatOptions(competitionFormat)}
          onChange={setOption}
        />
        <span className="text-xs text-on-surface-variant">
          {formatRanksByScore(format)
            ? 'Места — по сумме баллов. Баллы КП задаются в Mapper (IOF XML) или при создании дистанции'
            : 'Места — по времени'}
          . Результаты групп этой дистанции пересчитаются.
        </span>
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
