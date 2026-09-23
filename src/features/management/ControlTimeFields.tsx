import { LabeledSelect } from '../../components/LabeledSelect'
import { overtimePolicyHint, overtimePolicyOptionsFor } from './dictionaries'

interface ControlTimeFieldsProps {
  direction: string
  controlTimeMinutes: string
  overtimePolicy: string
  onChange: (patch: { controlTimeMinutes?: string; overtimePolicy?: string }) => void
}

/**
 * Контрольное время (КВ) соревнования и политика его применения — общие для мастера создания
 * и вкладки редактирования.
 *
 * КВ здесь — умолчание для всех групп; группа может задать своё (см. GroupDialog/AddGroupDialog).
 * Селектор политики показывается только когда КВ задано: без КВ выбирать нечего.
 */
export function ControlTimeFields({ direction, controlTimeMinutes, overtimePolicy, onChange }: ControlTimeFieldsProps) {
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
      {controlTimeMinutes !== '' && (
        <label className="flex flex-col gap-1">
          <LabeledSelect
            label="При превышении КВ"
            value={overtimePolicy}
            options={overtimePolicyOptionsFor(direction)}
            onChange={(value) => onChange({ overtimePolicy: value })}
          />
          <span className="text-xs text-on-surface-variant">{overtimePolicyHint(overtimePolicy)}</span>
        </label>
      )}
    </>
  )
}
