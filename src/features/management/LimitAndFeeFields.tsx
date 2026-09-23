interface LimitAndFeeFieldsProps {
  maxParticipants: string
  feeAmount: string
  onChange: (patch: { maxParticipants?: string; feeAmount?: string }) => void
}

/** Лимит участников и стартовый взнос — общие для мастера создания и вкладки редактирования. */
export function LimitAndFeeFields({ maxParticipants, feeAmount, onChange }: LimitAndFeeFieldsProps) {
  return (
    <div className="flex gap-2">
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm text-on-surface-variant">Макс. участников</span>
        <input
          value={maxParticipants}
          onChange={(e) => onChange({ maxParticipants: e.target.value.replace(/\D/g, '') })}
          inputMode="numeric"
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
        <span className="text-xs text-on-surface-variant">Пусто — без ограничений</span>
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm text-on-surface-variant">Стартовый взнос, ₽</span>
        <input
          value={feeAmount}
          onChange={(e) => onChange({ feeAmount: e.target.value.replace(/[^\d.]/g, '') })}
          inputMode="decimal"
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
        <span className="text-xs text-on-surface-variant">Пусто — участие бесплатное</span>
      </label>
    </div>
  )
}
