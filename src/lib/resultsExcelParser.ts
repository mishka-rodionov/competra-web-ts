/**
 * Разбирает Excel-протокол результатов прошедшего соревнования — формат придуман под задачу
 * оцифровки бумажных протоколов, не привязан к какому-то внешнему стандарту (см. Kotlin-версию,
 * web/utils/ResultsExcelParser.kt, для истории решения).
 *
 * .xlsx — бинарный ZIP+XML, парсится через SheetJS (npm-пакет "xlsx"). Библиотека весит
 * ~400 КБ несжатого JS и нужна только на этом экране (импорт прошедших результатов), поэтому
 * грузится лениво через dynamic import() при первом вызове.
 */

const HEADER_ALIASES = {
  fio: ['фамилия имя', 'фио', 'участник'],
  group: ['группа', 'возр. гр', 'возрастная группа', 'категория'],
  result: ['результат', 'время', 'итог'],
  place: ['место', 'место в группе', 'ранг'],
  start: ['время старта', 'старт'],
  finish: ['время финиша', 'финиш'],
}

interface RawExcelRow {
  fio: string
  group: string
  result: string
  place: string
  startOffset: string
  finishOffset: string
}

/** Одна распознанная и провалидированная строка результата прошедшего соревнования. */
export interface ParsedPastResultRow {
  lastName: string
  firstName: string
  groupTitle: string
  /** Секунды. null только при статусе, отличном от FINISHED. */
  totalTimeSeconds: number | null
  /** FINISHED / DNF / DNS / DSQ. */
  status: string
  rank: number | null
  /** Отсечка по общему секундомеру от старта соревнования, секунды. */
  startOffsetSeconds: number | null
  finishOffsetSeconds: number | null
}

/** Результат разбора файла — распознанные строки плюс сколько всего строк было в файле. */
export interface ParsedPastResultsFile {
  rows: ParsedPastResultRow[]
  totalRowsInFile: number
}

// "Результат": длительность M.SS / Ч:ММ.СС — точка перед секундами, как в протоколе.
const DURATION_DOT_REGEX = /^(?:(\d+):)?(\d{1,2})\.(\d{2})$/
// "Время старта"/"Время финиша": отсечка по секундомеру M:SS / Ч:ММ:СС — двоеточие.
const OFFSET_COLON_REGEX = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/

function parseDurationDotSeconds(text: string): number | null {
  const m = DURATION_DOT_REGEX.exec(text.trim())
  if (!m) return null
  return (Number(m[1]) || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

function parseOffsetColonSeconds(text: string): number | null {
  const m = OFFSET_COLON_REGEX.exec(text.trim())
  if (!m) return null
  return (Number(m[1]) || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

function parseStatusWord(text: string): string | null {
  switch (text.trim().toLowerCase()) {
    case 'снят':
    case 'снята':
      return 'DSQ'
    case 'н/с':
      return 'DNS'
    case 'не финишировал':
    case 'не финишировала':
      return 'DNF'
    default:
      return null
  }
}

/**
 * Если в группе хотя бы у одного финишировавшего не указано место — пересчитывает места для
 * всей группы по времени (сортировка по возрастанию). DSQ/DNS/DNF места не получают. Группы,
 * где место указано у всех, не трогаем.
 */
function fillMissingRanks(rows: ParsedPastResultRow[]): ParsedPastResultRow[] {
  const result = [...rows]
  const byGroup = new Map<string, { row: ParsedPastResultRow; index: number }[]>()
  rows.forEach((row, index) => {
    const list = byGroup.get(row.groupTitle) ?? []
    list.push({ row, index })
    byGroup.set(row.groupTitle, list)
  })

  for (const indexedGroup of byGroup.values()) {
    const needsAutoRank = indexedGroup.some(({ row }) => row.rank == null && row.status === 'FINISHED')
    if (!needsAutoRank) continue
    indexedGroup
      .filter(({ row }) => row.status === 'FINISHED')
      .sort((a, b) => (a.row.totalTimeSeconds ?? Infinity) - (b.row.totalTimeSeconds ?? Infinity))
      .forEach(({ row, index }, place) => {
        result[index] = { ...row, rank: place + 1 }
      })
  }
  return result
}

function findCol(header: string[], aliases: string[]): number {
  return header.findIndex((h) => aliases.includes(h))
}

/**
 * Парсит Excel-файл результатов. Группа в пустой ячейке наследуется от строки выше (как
 * повторяющиеся кавычки в бумажном протоколе). «Результат» обязателен, если не заполнена пара
 * «Время старта»+«Время финиша» — тогда чистое время считается как разница отсечек. Строки, из
 * которых не удалось получить ни статус, ни время, — пропускаются.
 */
export async function parseResultsExcel(file: File): Promise<ParsedPastResultsFile | null> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) return { rows: [], totalRowsInFile: 0 }

  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' })
  if (aoa.length === 0) return { rows: [], totalRowsInFile: 0 }

  const header = aoa[0].map((h) => String(h || '').trim().toLowerCase())
  const colFio = findCol(header, HEADER_ALIASES.fio)
  const colGroup = findCol(header, HEADER_ALIASES.group)
  const colResult = findCol(header, HEADER_ALIASES.result)
  const colPlace = findCol(header, HEADER_ALIASES.place)
  const colStart = findCol(header, HEADER_ALIASES.start)
  const colFinish = findCol(header, HEADER_ALIASES.finish)

  const cell = (r: string[], idx: number) => (idx >= 0 && idx < r.length ? String(r[idx] ?? '').trim() : '')

  const rawRows: RawExcelRow[] = []
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i]
    if (!r || r.length === 0) continue
    const fio = cell(r, colFio)
    if (fio === '') continue
    rawRows.push({
      fio,
      group: cell(r, colGroup),
      result: cell(r, colResult),
      place: cell(r, colPlace),
      startOffset: cell(r, colStart),
      finishOffset: cell(r, colFinish),
    })
  }

  let lastGroup = ''
  const result: ParsedPastResultRow[] = []

  for (const row of rawRows) {
    const group = row.group || lastGroup
    lastGroup = group
    if (!group) continue

    const nameParts = row.fio.trim().split(/\s+/)
    const lastName = nameParts[0] ?? ''
    const firstName = nameParts.slice(1).join(' ')
    if (!lastName) continue

    const startOffset = parseOffsetColonSeconds(row.startOffset)
    const finishOffset = parseOffsetColonSeconds(row.finishOffset)
    const statusWord = parseStatusWord(row.result)
    const explicitDuration = parseDurationDotSeconds(row.result)

    let totalTime: number | null
    let status: string
    if (statusWord != null) {
      totalTime = null
      status = statusWord
    } else if (explicitDuration != null) {
      totalTime = explicitDuration
      status = 'FINISHED'
    } else if (startOffset != null && finishOffset != null) {
      totalTime = finishOffset - startOffset
      status = 'FINISHED'
    } else {
      continue
    }

    result.push({
      lastName,
      firstName,
      groupTitle: group,
      totalTimeSeconds: totalTime,
      status,
      rank: row.place ? Number(row.place) || null : null,
      startOffsetSeconds: startOffset,
      finishOffsetSeconds: finishOffset,
    })
  }

  return { rows: fillMissingRanks(result), totalRowsInFile: rawRows.length }
}
