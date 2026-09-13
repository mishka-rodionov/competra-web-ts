import type { TrackPoint } from './trackCodec'

const TRKPT_BLOCK = /<trkpt\b[^>]*>[\s\S]*?<\/trkpt>/g
const TRKPT_OPEN = /<trkpt\b([^>]*)>/
const LAT_ATTR = /lat="(-?[0-9.]+)"/
const LON_ATTR = /lon="(-?[0-9.]+)"/
const TIME_TAG = /<time>([^<]+)<\/time>/

/**
 * Извлекает точки трека из содержимого GPX-файла. Парсинг регулярками, а не через
 * полноценный DOM-парсер — формат `<trkpt lat lon><time>` достаточно простой и стабильный
 * у экспортёров треков (Strava, Garmin, OSMAnd и т.п.). Если у точки нет `<time>`, ей
 * присваивается синтетическое смещение по индексу (1с/точку).
 */
export function parseGpxTrackPoints(gpxContent: string): TrackPoint[] {
  const points: TrackPoint[] = []
  let index = 0
  for (const match of gpxContent.matchAll(TRKPT_BLOCK)) {
    const block = match[0]
    const openTag = TRKPT_OPEN.exec(block)?.[1]
    if (openTag == null) continue
    const lat = parseFloat(LAT_ATTR.exec(openTag)?.[1] ?? '')
    const lon = parseFloat(LON_ATTR.exec(openTag)?.[1] ?? '')
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue
    const timeStr = TIME_TAG.exec(block)?.[1]
    const parsedMs = timeStr ? Date.parse(timeStr) : NaN
    points.push({ lat, lon, timestampMs: Number.isNaN(parsedMs) ? index * 1000 : parsedMs })
    index++
  }
  return points
}
