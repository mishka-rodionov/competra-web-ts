import { useMemo } from 'react'
import { availableTimeZones, zoneOffsetLabel } from '../lib/dateUtils'

interface TimeZoneSelectProps {
  zoneId: string
  onSelect: (zoneId: string) => void
}

/**
 * Нативный select вместо диалога с поиском из старого приложения (TimeZoneField) —
 * браузер уже даёт поиск по вводу текста в фокусированном select, отдельный UI не нужен.
 */
export function TimeZoneSelect({ zoneId, onSelect }: TimeZoneSelectProps) {
  const options = useMemo(
    () => availableTimeZones().map((zone) => [zone, zoneOffsetLabel(zone)] as const),
    [],
  )

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-variant">Часовой пояс *</span>
      <select
        value={zoneId}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
      >
        {options.map(([zone, label]) => (
          <option key={zone} value={zone}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
