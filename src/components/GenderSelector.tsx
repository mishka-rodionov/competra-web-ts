import type { Gender } from '../types/user'

const OPTIONS: [Gender, string][] = [
  ['male', 'Мужской'],
  ['female', 'Женский'],
]

interface GenderSelectorProps {
  value: Gender | null
  onChange: (value: Gender) => void
  required?: boolean
}

/**
 * Выбор пола пользователя — сегментированный переключатель из двух вариантов,
 * как SegmentedButton в Android (GenderSelector в :feature:profile).
 */
export function GenderSelector({ value, onChange, required }: GenderSelectorProps) {
  return (
    <div className="flex flex-col gap-1" role="radiogroup" aria-label="Пол">
      <span className="text-sm text-on-surface-variant">
        Пол
        {required && ' *'}
      </span>
      <div className="flex overflow-hidden rounded-md border border-outline">
        {OPTIONS.map(([key, title], index) => {
          const selected = value === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(key)}
              className={`flex-1 px-3 py-2 text-sm ${index > 0 ? 'border-l border-outline' : ''} ${
                selected ? 'bg-primary font-medium text-on-primary' : 'bg-surface text-fg'
              }`}
            >
              {title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
