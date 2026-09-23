import { formatTime } from './dateUtils'
import type { OrienteeringParticipant, OrienteeringResult, SaveResultRequest, SplitTime } from '../types/participant'

/** Одна строка результата, распознанная в HTML-протоколе (ещё не сопоставленная с участником). */
export interface ParsedResultRow {
  groupTitle: string
  startNumber: string
  fullName: string
  totalTimeSeconds: number | null
  status: string | null
  rank: number | null
  /** Контрольный пункт -> кумулятивное время от старта в секундах (null = участник его не прошёл). */
  splits: [number, number | null][]
}

const RACE_TIME_REGEX = /^(\d+):(\d{2}):(\d{2})$/
const SPLIT_CELL_REGEX = /^(\d+):(\d{2}):(\d{2})\(\d+\)$/

function parseRaceTimeSeconds(text: string): number | null {
  const m = RACE_TIME_REGEX.exec(text.trim())
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

function parseSplitCumulSeconds(text: string): number | null {
  const m = SPLIT_CELL_REGEX.exec(text.trim())
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/** Обратное преобразование statusText из формата экспорта результатов старого приложения. */
function parseResultStatus(text: string): [string | null, number | null] {
  const trimmed = text.trim()
  if (trimmed === '') return [null, null]
  if (trimmed === 'снят') return ['DSQ', null]
  if (trimmed === 'превышено кв') return ['OVERTIME', null]
  if (trimmed === 'н/с') return ['DNS', null]
  if (trimmed === 'не финишировал') return ['DNF', null]
  const seconds = parseRaceTimeSeconds(trimmed)
  return seconds != null ? ['FINISHED', seconds] : [null, null]
}

interface RawHtmlRow {
  startNumber: string
  fullName: string
  resultText: string
  rankText: string
  splits: { cp: number; text: string }[]
}

interface RawHtmlGroup {
  title: string
  rows: RawHtmlRow[]
}

function parseHtmlDocument(html: string): RawHtmlGroup[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = Array.from(doc.querySelectorAll('table.rezult'))

  return tables.map((table) => {
    let title = ''
    let el = table.previousElementSibling
    while (el) {
      if (el.tagName === 'A' && el.hasAttribute('name')) {
        title = el.getAttribute('name') ?? ''
        break
      }
      el = el.previousElementSibling
    }

    const trs = Array.from(table.querySelectorAll('tr'))
    if (trs.length === 0) return { title, rows: [] }

    const headerThs = Array.from(trs[0].querySelectorAll('th'))
    const cpNumbers = headerThs.slice(7).map((th) => {
      const m = /\((\d+)\)/.exec(th.textContent ?? '')
      return m ? Number(m[1]) : 0
    })

    const rows = trs
      .slice(1)
      .map((tr): RawHtmlRow | null => {
        const tds = Array.from(tr.querySelectorAll('td'))
        if (tds.length < 7) return null
        const splitCells = tds.slice(7)
        const splits = splitCells.map((td, i) => {
          const parts = td.innerHTML.split(/<br\s*\/?>/i)
          const first = (parts[0] ?? '').replace(/<[^>]+>/g, '').trim()
          return { cp: cpNumbers[i] ?? 0, text: first }
        })
        return {
          startNumber: (tds[1].textContent ?? '').trim(),
          fullName: (tds[2].textContent ?? '').trim(),
          resultText: (tds[4].textContent ?? '').trim(),
          rankText: (tds[5].textContent ?? '').trim(),
          splits,
        }
      })
      .filter((r): r is RawHtmlRow => r != null)

    return { title, rows }
  })
}

/** Парсит HTML-протокол результатов в плоский список строк, без сопоставления с участниками. */
export function parseResultsHtml(html: string): ParsedResultRow[] {
  const groups = parseHtmlDocument(html)
  return groups.flatMap((group) =>
    group.rows
      .filter((row) => row.startNumber !== '')
      .map((row): ParsedResultRow => {
        const [status, totalTimeSeconds] = parseResultStatus(row.resultText)
        return {
          groupTitle: group.title,
          startNumber: row.startNumber,
          fullName: row.fullName,
          totalTimeSeconds,
          status,
          rank: row.rankText ? Number(row.rankText) || null : null,
          splits: row.splits.map((s) => [s.cp, parseSplitCumulSeconds(s.text)]),
        }
      }),
  )
}

/** Одна изменившаяся и заматченная строка импорта, готовая к показу в превью и к отправке. */
export interface ImportResultRow {
  participant: OrienteeringParticipant
  existing: OrienteeringResult | null
  request: SaveResultRequest
  changeSummary: string
}

export interface ImportResultsDiff {
  changed: ImportResultRow[]
  unmatched: ParsedResultRow[]
}

function splitsEqual(a: SplitTime[] | null | undefined, b: SplitTime[] | null | undefined): boolean {
  const sortedA = [...(a ?? [])].sort((x, y) => x.controlPoint - y.controlPoint)
  const sortedB = [...(b ?? [])].sort((x, y) => x.controlPoint - y.controlPoint)
  if (sortedA.length !== sortedB.length) return false
  return sortedA.every((s, i) => s.controlPoint === sortedB[i].controlPoint && s.timestamp === sortedB[i].timestamp)
}

function buildChangeSummary(existing: OrienteeringResult | null, request: SaveResultRequest, groupMismatch: boolean): string {
  const parts: string[] = []
  if (groupMismatch) parts.push('⚠ группа в файле не совпадает с текущей группой участника')
  if (existing?.rank !== request.rank) parts.push(`Место: ${existing?.rank ?? '—'} → ${request.rank ?? '—'}`)
  if (existing?.totalTime !== request.totalTime) {
    const oldT = existing?.totalTime != null ? formatTime(existing.totalTime) : '—'
    const newT = request.totalTime != null ? formatTime(request.totalTime) : '—'
    parts.push(`Время: ${oldT} → ${newT}`)
  }
  if (existing?.status !== request.status) parts.push(`Статус: ${existing?.status ?? '—'} → ${request.status}`)
  const oldSplitsCount = existing?.splits?.length ?? 0
  const newSplitsCount = request.splits?.length ?? 0
  if (oldSplitsCount !== newSplitsCount) parts.push(`КП: ${oldSplitsCount} → ${newSplitsCount}`)
  return parts.length > 0 ? parts.join('; ') : 'Без изменений'
}

/**
 * Сопоставляет распарсенные строки с текущими участниками (по startNumber — номер уникален
 * в рамках всего соревнования) и текущими результатами, оставляя только реально изменившиеся строки.
 */
export function buildResultsDiff(
  parsedRows: ParsedResultRow[],
  participants: OrienteeringParticipant[],
  currentResults: OrienteeringResult[],
  competitionId: string,
): ImportResultsDiff {
  const participantsByNumber = new Map(participants.filter((p) => p.startNumber).map((p) => [p.startNumber!, p]))
  const resultsByParticipantId = new Map(currentResults.map((r) => [r.participantId, r]))

  const changed: ImportResultRow[] = []
  const unmatched: ParsedResultRow[] = []

  for (const row of parsedRows) {
    const participant = participantsByNumber.get(row.startNumber)
    if (!participant) {
      unmatched.push(row)
      continue
    }

    const existing = resultsByParticipantId.get(participant.id) ?? null
    const anchorStart = existing?.startTime ?? participant.startTime
    const newSplits: SplitTime[] | null =
      anchorStart != null
        ? row.splits
            .filter((s): s is [number, number] => s[1] != null)
            .map(([cp, cumulSec]) => ({ controlPoint: cp, timestamp: anchorStart + cumulSec * 1000 }))
        : null
    const effectiveSplits = newSplits && newSplits.length > 0 ? newSplits : null

    const newStatus = row.status ?? existing?.status ?? 'FINISHED'
    const newTotalTime = row.totalTimeSeconds ?? existing?.totalTime ?? null
    const newRank = row.rank ?? existing?.rank ?? null

    const isChanged =
      !existing ||
      existing.totalTime !== newTotalTime ||
      existing.rank !== newRank ||
      existing.status !== newStatus ||
      !splitsEqual(existing.splits, effectiveSplits)

    if (!isChanged) continue

    const request: SaveResultRequest = {
      id: existing?.id ?? crypto.randomUUID(),
      competitionId,
      groupId: participant.groupId,
      participantId: participant.id,
      startTime: existing?.startTime ?? null,
      finishTime: existing?.finishTime ?? null,
      totalTime: newTotalTime,
      rank: newRank,
      status: newStatus,
      penaltyTime: existing?.penaltyTime ?? 0,
      splits: effectiveSplits,
      isEditable: existing?.isEditable ?? true,
      isEdited: true,
    }

    const groupMismatch = !!participant.groupName && !!row.groupTitle && participant.groupName !== row.groupTitle

    changed.push({ participant, existing, request, changeSummary: buildChangeSummary(existing, request, groupMismatch) })
  }

  return { changed, unmatched }
}
