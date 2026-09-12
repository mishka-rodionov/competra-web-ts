export const DEFAULT_TIME_ZONE = 'Europe/Moscow'

/** Дата в локали ru-RU, напр. "12.09.2026". */
export function toLocaleDateString(ms: number): string {
  return new Date(ms).toLocaleDateString('ru-RU')
}

/** Время «ЧЧ:ММ» из UTC-таймстампа в указанном часовом поясе. */
export function utcMillisToZonedTime(ms: number, zoneId: string): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: zoneId,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
  return formatted.startsWith('24:') ? `00:${formatted.slice(3)}` : formatted
}

/** "1:23:45" для часов>0, иначе "23:45". totalSeconds — целое число секунд. */
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/**
 * "ГГГГ-ММ-ДД" + "ЧЧ:ММ" в указанном часовом поясе → UTC-таймстамп (мс).
 * dateStr приходит прямо из <input type="date">, поэтому, в отличие от Kotlin-версии
 * (там на входе UTC-полночь от Material3 DatePicker), не нужен отдельный шаг
 * "распарсить дату из millis" — берём год/месяц/день из строки напрямую.
 */
export function zonedDateTimeToUtcMillis(dateStr: string, timeStr: string, zoneId: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const asUtc = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0)

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zoneId,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const part of dtf.formatToParts(new Date(asUtc))) parts[part.type] = part.value
  let h = parseInt(parts.hour, 10)
  if (h === 24) h = 0
  const shown = Date.UTC(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    h,
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10),
  )
  return asUtc - (shown - asUtc)
}

/** "ГГГГ-ММ-ДД" из UTC-таймстампа в указанном часовом поясе — для value <input type="date">. */
export function utcMillisToZonedDate(ms: number, zoneId: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

/** Список IANA-часовых поясов из браузера. */
export function availableTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['UTC', 'Europe/Kaliningrad', DEFAULT_TIME_ZONE, 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk']
  }
}

/** Подпись зоны вида "Europe/Moscow (UTC+03:00)". */
export function zoneOffsetLabel(zoneId: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zoneId, timeZoneName: 'longOffset' }).formatToParts(
      new Date(),
    )
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
    const offset = tzName === 'GMT' ? 'UTC+00:00' : tzName.replace('GMT', 'UTC')
    return `${zoneId} (${offset})`
  } catch {
    return zoneId
  }
}
