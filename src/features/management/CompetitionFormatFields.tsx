import { LabeledSelect } from '../../components/LabeledSelect'
import { BY_CHOICE_MODE_OPTIONS, byChoiceModeHint, DIRECTION_OPTIONS } from './dictionaries'

interface CompetitionFormatFieldsProps {
  direction: string
  byChoiceMode: string
  onChange: (patch: { direction: string; byChoiceMode: string }) => void
}

/**
 * Формат соревнования по умолчанию: направление и, для «по выбору», итог — по баллам (score-О) или
 * по минимуму КП. Общие для мастера создания и вкладки редактирования. Дистанция может задать свой
 * формат (DistanceDialog, lib/courseFormat).
 */
export function CompetitionFormatFields({ direction, byChoiceMode, onChange }: CompetitionFormatFieldsProps) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <LabeledSelect
          label="Направление"
          value={direction}
          options={DIRECTION_OPTIONS}
          onChange={(value) => onChange({ direction: value, byChoiceMode })}
        />
        <span className="text-xs text-on-surface-variant">Формат по умолчанию — можно изменить для отдельной дистанции</span>
      </label>
      {direction === 'BY_CHOICE' && (
        <label className="flex flex-col gap-1">
          <LabeledSelect
            label="Итог «по выбору»"
            value={byChoiceMode}
            options={BY_CHOICE_MODE_OPTIONS}
            onChange={(value) => onChange({ direction, byChoiceMode: value })}
          />
          <span className="text-xs text-on-surface-variant">{byChoiceModeHint(byChoiceMode)}</span>
        </label>
      )}
    </>
  )
}
