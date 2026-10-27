import { useState } from 'react'
import { LabeledSelect } from '../../components/LabeledSelect'
import { STANDARD_GROUP_TITLES } from '../../lib/standardGroups'
import { NO_DISTANCE_KEY } from './types'

interface StandardGroupsDialogProps {
  /** Пары [ключ дистанции, название]; непустой список. */
  distanceOptions: [string, string][]
  /** Названия уже созданных групп — их нельзя отметить повторно. */
  existingTitles: string[]
  onDismiss: () => void
  onConfirm: (titles: string[], defaultDistanceKey: string) => void
}

/**
 * «Добавить стандартные группы»: отметить группы из стандартного набора и дистанцию по умолчанию.
 * Пол и возраст выводятся из названия, дистанция — по совпадению названий, иначе выбранная.
 * Аналог Android — `StandardGroupsDialog.kt`.
 */
export function StandardGroupsDialog({ distanceOptions, existingTitles, onDismiss, onConfirm }: StandardGroupsDialogProps) {
  const existing = new Set(existingTitles.map((t) => t.trim().toLowerCase()))
  const available = STANDARD_GROUP_TITLES.filter((t) => !existing.has(t.toLowerCase()))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [defaultDistanceKey, setDefaultDistanceKey] = useState(distanceOptions[0]?.[0] ?? NO_DISTANCE_KEY)

  function toggle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div
        className="flex max-h-full w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-fg">Стандартные группы</h3>
        <div className="flex gap-3 text-sm">
          <button type="button" onClick={() => setSelected(new Set(available))} className="text-primary">
            Все
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-primary">
            Снять
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {available.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => toggle(title)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selected.has(title) ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant">
          Пол и возраст заполнятся по названию: Ж14 — до 14 лет, М35 — 35 лет и старше, М21 — без ограничения.
        </p>
        {distanceOptions.length > 0 ? (
          <>
            <LabeledSelect
              label="Дистанция по умолчанию"
              value={defaultDistanceKey}
              options={[[NO_DISTANCE_KEY, 'Не назначена'], ...distanceOptions]}
              onChange={setDefaultDistanceKey}
            />
            <p className="text-xs text-on-surface-variant">
              Если дистанция называется так же, как группа (например, «М21»), группа получит её.
            </p>
          </>
        ) : (
          <p className="text-xs text-on-surface-variant">Дистанций пока нет — группы будут без дистанции.</p>
        )}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => onConfirm(STANDARD_GROUP_TITLES.filter((t) => selected.has(t)), defaultDistanceKey)}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            Добавить ({selected.size})
          </button>
        </div>
      </div>
    </div>
  )
}
