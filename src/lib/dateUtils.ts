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
