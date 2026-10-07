import { LabeledSelect } from '../../components/LabeledSelect'
import { BY_CHOICE_MODE_OPTIONS, byChoiceModeHint, DIRECTION_OPTIONS, formatPatch } from './dictionaries'

interface CompetitionFormatFieldsProps {
  direction: string
  byChoiceMode: string
  overtimePolicy: string
  onChange: (patch: { direction: string; byChoiceMode: string; overtimePolicy: string }) => void
}

/**
 * Направление соревнования и, для «по выбору», итог: по баллам (score-О) или по минимуму КП —
 * общие для мастера создания и вкладки редактирования. Смена формата сбрасывает штраф очками,
 * если в новом формате очков нет (см. formatPatch).
 */
export function CompetitionFormatFields({ direction, byChoiceMode, overtimePolicy, onChange }: CompetitionFormatFieldsProps) {
  return (
    <>
      <LabeledSelect
        label="Направление"
        value={direction}
        options={DIRECTION_OPTIONS}
        onChange={(value) => onChange(formatPatch(value, byChoiceMode, overtimePolicy))}
      />
      {direction === 'BY_CHOICE' && (
        <label className="flex flex-col gap-1">
          <LabeledSelect
            label="Итог «по выбору»"
            value={byChoiceMode}
            options={BY_CHOICE_MODE_OPTIONS}
            onChange={(value) => onChange(formatPatch(direction, value, overtimePolicy))}
          />
          <span className="text-xs text-on-surface-variant">{byChoiceModeHint(byChoiceMode)}</span>
        </label>
      )}
    </>
  )
}
