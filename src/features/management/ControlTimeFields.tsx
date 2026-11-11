import { LabeledSelect } from '../../components/LabeledSelect'
import { OVERTIME_POLICY_OPTIONS, overtimePolicyHint } from './dictionaries'

interface ControlTimeFieldsProps {
  controlTimeMinutes: string
  /** Политика для дистанций, где места по времени (IGNORE / DISQUALIFY). */
  timeOvertimePolicy: string
  /** Политика для дистанций с баллами (IGNORE / DISQUALIFY / SCORE_PENALTY). */
  scoreOvertimePolicy: string
  /** Есть дистанции (или формат по умолчанию), где места по времени. */
  hasTimeCourses: boolean
  /** Есть дистанции (или формат по умолчанию), где места по баллам. */
  hasScoreCourses: boolean
  onChange: (patch: { controlTimeMinutes?: string; timeOvertimePolicy?: string; scoreOvertimePolicy?: string }) => void
}

/**
 * Контрольное время (КВ) соревнования и политика его применения — общие для мастера создания
 * и вкладки редактирования.
 *
 * КВ здесь — умолчание для всех групп; группа может задать своё (см. GroupDialog/AddGroupDialog).
 * Политика своя у дистанций по времени и с баллами: селектор каждого вида показывается, только
 * если такие дистанции есть, и только когда КВ задано — без КВ выбирать нечего.
 */
export function ControlTimeFields({
  controlTimeMinutes,
  timeOvertimePolicy,
  scoreOvertimePolicy,
  hasTimeCourses,
  hasScoreCourses,
  onChange,
}: ControlTimeFieldsProps) {
  const showsBoth = hasTimeCourses && hasScoreCourses
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-on-surface-variant">Контрольное время, мин</span>
        <input
          value={controlTimeMinutes}
          onChange={(e) => onChange({ controlTimeMinutes: e.target.value.replace(/\D/g, '') })}
          inputMode="numeric"
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
        <span className="text-xs text-on-surface-variant">
          Пусто — без КВ. Группа может задать своё значение
        </span>
      </label>
      {controlTimeMinutes !== '' && hasTimeCourses && (
        <label className="flex flex-col gap-1">
          <LabeledSelect
            label={showsBoth ? 'При превышении КВ — дистанции по времени' : 'При превышении КВ'}
            value={timeOvertimePolicy}
            // Штраф очками осмыслен только у дистанций с баллами.
            options={OVERTIME_POLICY_OPTIONS.filter(([key]) => key !== 'SCORE_PENALTY')}
            onChange={(value) => onChange({ timeOvertimePolicy: value })}
          />
          <span className="text-xs text-on-surface-variant">{overtimePolicyHint(timeOvertimePolicy)}</span>
        </label>
      )}
      {controlTimeMinutes !== '' && hasScoreCourses && (
        <label className="flex flex-col gap-1">
          <LabeledSelect
            label={showsBoth ? 'При превышении КВ — дистанции с баллами' : 'При превышении КВ'}
            value={scoreOvertimePolicy}
            options={OVERTIME_POLICY_OPTIONS}
            onChange={(value) => onChange({ scoreOvertimePolicy: value })}
          />
          <span className="text-xs text-on-surface-variant">{overtimePolicyHint(scoreOvertimePolicy)}</span>
        </label>
      )}
    </>
  )
}
