import { FEE_CURRENCY_OPTIONS } from './dictionaries'

interface LimitAndFeeFieldsProps {
  maxParticipants: string
  feeAmount: string
  feeCurrency: string
  onChange: (patch: { maxParticipants?: string; feeAmount?: string; feeCurrency?: string }) => void
}

/** Лимит участников, стартовый взнос и его валюта — общие для мастера создания и вкладки редактирования. */
export function LimitAndFeeFields({ maxParticipants, feeAmount, feeCurrency, onChange }: LimitAndFeeFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-on-surface-variant">Макс. участников</span>
        <input
          value={maxParticipants}
          onChange={(e) => onChange({ maxParticipants: e.target.value.replace(/\D/g, '') })}
          inputMode="numeric"
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
        <span className="text-xs text-on-surface-variant">Пусто — без ограничений</span>
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Стартовый взнос</span>
          <input
            value={feeAmount}
            onChange={(e) => onChange({ feeAmount: e.target.value.replace(/[^\d.]/g, '') })}
            inputMode="decimal"
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
          <span className="text-xs text-on-surface-variant">Пусто — участие бесплатное</span>
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Валюта</span>
          <select
            value={feeCurrency}
            onChange={(e) => onChange({ feeCurrency: e.target.value })}
            className="rounded-md border border-outline bg-surface px-2 py-2 text-fg"
          >
            {FEE_CURRENCY_OPTIONS.map(([code, text]) => (
              <option key={code} value={code}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
