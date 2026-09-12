import { SPORT_TYPES, STATUSES } from './labels'
import type { CompetitionsFilter } from './hooks'

interface FilterSheetProps {
  draft: CompetitionsFilter
  onChange: (draft: CompetitionsFilter) => void
  onApply: () => void
  onReset: () => void
  onClose: () => void
}

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

export function FilterSheet({ draft, onChange, onApply, onReset, onClose }: FilterSheetProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-fg/40" onClick={onClose}>
      <div className="w-full rounded-t-lg bg-surface p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium text-fg">Фильтры</h2>

        <p className="mt-4 mb-1 text-sm font-medium text-fg">Вид спорта</p>
        {SPORT_TYPES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={draft.kindOfSports.includes(key)}
              onChange={() => onChange({ ...draft, kindOfSports: toggle(draft.kindOfSports, key) })}
            />
            <span className="text-sm text-fg">{label}</span>
          </label>
        ))}

        <p className="mt-4 mb-1 text-sm font-medium text-fg">Статус</p>
        {STATUSES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={draft.statuses.includes(key)}
              onChange={() => onChange({ ...draft, statuses: toggle(draft.statuses, key) })}
            />
            <span className="text-sm text-fg">{label}</span>
          </label>
        ))}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  )
}
