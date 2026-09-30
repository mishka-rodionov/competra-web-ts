import type { ControlPoint, Distance } from '../types/distance'
import type { OrienteeringParticipant, OrienteeringResult, SplitTime } from '../types/participant'
import type {
  RaceGraphData,
  RaceGraphPoint,
  RaceGraphSeries,
  ScoreGraphData,
  ScoreGraphPoint,
  ScoreGraphSeries,
  SplitsTable,
  SplitsTableCell,
  SplitsTableColumn,
  SplitsTableRow,
} from '../types/splits'

const EARTH_RADIUS_METERS = 6_371_000

type GeoPoint = Pick<ControlPoint, 'latitude' | 'longitude'>

/** Расстояние между двумя точками по WGS84 (haversine), в метрах. Null, если у одной из точек нет координат. */
export function controlPointDistanceMeters(from: GeoPoint | null | undefined, to: GeoPoint | null | undefined): number | null {
  const lat1 = from?.latitude
  const lon1 = from?.longitude
  const lat2 = to?.latitude
  const lon2 = to?.longitude
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Темп на перегоне (мин/км), либо null если длина перегона неизвестна/нулевая. */
export function paceMinPerKm(deltaSeconds: number, legLengthMeters: number | null): number | null {
  if (legLengthMeters == null || legLengthMeters <= 0) return null
  return deltaSeconds / 60 / (legLengthMeters / 1000)
}

function startPoint(distance: Distance | undefined): GeoPoint | null {
  return distance ? { latitude: distance.startLatitude ?? null, longitude: distance.startLongitude ?? null } : null
}

function finishPoint(distance: Distance | undefined): GeoPoint | null {
  return distance ? { latitude: distance.finishLatitude ?? null, longitude: distance.finishLongitude ?? null } : null
}

/**
 * Длина перегона (м) для каждой позиции cpOrder. Первый перегон — от старта, перегон на финишную
 * станцию (она приходит последним сплитом, но в controlPoints дистанции её нет) — до финиша.
 * Null там, где у одного из концов перегона нет координат (например, дистанция создана вручную).
 */
function legLengthsMeters(distance: Distance | undefined, cpOrder: number[]): (number | null)[] {
  const expected = distance?.controlPoints
  if (!expected) return cpOrder.map(() => null)
  const pointAt = (i: number): GeoPoint | null => {
    if (i < expected.length) return expected[i]
    return i === expected.length && cpOrder[i] === distance?.finishControlPoint ? finishPoint(distance) : null
  }
  return cpOrder.map((_, i) => controlPointDistanceMeters(i === 0 ? startPoint(distance) : pointAt(i - 1), pointAt(i)))
}

function anchorStartTime(participant: OrienteeringParticipant, result: OrienteeringResult | null | undefined): number | null {
  return result?.startTime ?? participant.startTime
}

/**
 * Делит отметки чипа на сделанные до старта и отметки на дистанции. Отметки до старта бывают,
 * когда участник в стартовом городке отмечает финишную (или любую другую) станцию — в гонку они не
 * входят: иначе первый перегон получался отрицательным, а все последующие сплиты сдвигались на
 * позицию относительно колонок КП. Время старта неизвестно — все отметки считаются дистанционными.
 */
export function partitionSplitsByStart(
  splits: SplitTime[] | null | undefined,
  startTs: number | null,
): { preStart: SplitTime[]; race: SplitTime[] } {
  const all = splits ?? []
  if (startTs == null) return { preStart: [], race: all }
  return { preStart: all.filter((s) => s.timestamp < startTs), race: all.filter((s) => s.timestamp >= startTs) }
}

/** Результат с отметками только на дистанции (см. partitionSplitsByStart). */
function withRaceSplits(participant: OrienteeringParticipant, result: OrienteeringResult | null | undefined): OrienteeringResult | null {
  if (!result?.splits) return result ?? null
  return { ...result, splits: partitionSplitsByStart(result.splits, anchorStartTime(participant, result)).race }
}

function statusSortOrder(status: string | undefined): number {
  switch (status) {
    case 'FINISHED':
      return 0
    // Превысившие КВ идут сразу за финишировавшими: результат показан, но места нет.
    case 'OVERTIME':
      return 1
    case 'DSQ':
      return 2
    case 'DNF':
      return 3
    case 'DNS':
      return 4
    case 'STARTED':
      return 5
    case 'REGISTERED':
      return 6
    default:
      return 9
  }
}

/** Порядок строк результатов/таблицы сплитов: по статусу, затем по времени (или по очкам по убыванию для BY_CHOICE). */
export function sortedForResults(
  participants: OrienteeringParticipant[],
  results: OrienteeringResult[],
  direction = 'FORWARD',
): OrienteeringParticipant[] {
  const resultByParticipantId = new Map(results.map((r) => [r.participantId, r]))
  const sorted = [...participants]
  if (direction === 'BY_CHOICE') {
    sorted.sort((a, b) => {
      const ra = resultByParticipantId.get(a.id)
      const rb = resultByParticipantId.get(b.id)
      const statusDiff = statusSortOrder(ra?.status) - statusSortOrder(rb?.status)
      if (statusDiff !== 0) return statusDiff
      const scoreDiff = (rb?.totalScore ?? 0) - (ra?.totalScore ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      return (ra?.finishTime ?? Number.MAX_SAFE_INTEGER) - (rb?.finishTime ?? Number.MAX_SAFE_INTEGER)
    })
  } else {
    sorted.sort((a, b) => {
      const ra = resultByParticipantId.get(a.id)
      const rb = resultByParticipantId.get(b.id)
      const statusDiff = statusSortOrder(ra?.status) - statusSortOrder(rb?.status)
      if (statusDiff !== 0) return statusDiff
      return (ra?.totalTime ?? Number.MAX_SAFE_INTEGER) - (rb?.totalTime ?? Number.MAX_SAFE_INTEGER)
    })
  }
  return sorted
}

/**
 * Сырые очки участника за фактически взятые КП (BY_CHOICE), ДО вычета штрафа — сумма очков КП
 * из splits результата. totalScore хранится уже за вычетом штрафа, а при обнулении результата
 * (сильное опоздание) totalScore+scorePenalty не равен фактически заработанным очкам — поэтому
 * считаем от дистанции, как и HTML-экспорт результатов. Фолбэк на totalScore+scorePenalty, если
 * карта очков КП дистанции недоступна.
 */
function rawByChoiceScore(result: OrienteeringResult | null, scoreByNumber: Map<number, number>): number | null {
  if (!result || result.totalScore == null) return null
  if (scoreByNumber.size > 0) {
    return result.splits?.reduce((sum, s) => sum + (scoreByNumber.get(s.controlPoint) ?? 0), 0) ?? result.totalScore + result.scorePenalty
  }
  return result.totalScore + result.scorePenalty
}

/**
 * Дистанция, пройденная участником (BY_CHOICE), в метрах — сумма расстояний от старта через
 * последовательно взятые КП (включая финишную станцию) по их координатам. Перегоны с неизвестными
 * координатами (в т.ч. от старта, если его координат нет) в сумму не входят.
 */
function byChoiceDistanceMeters(splits: SplitTime[], distance: Distance | undefined): number | null {
  const controlPointByNumber = new Map<number, GeoPoint>((distance?.controlPoints ?? []).map((cp) => [cp.number, cp]))
  if (controlPointByNumber.size === 0 || splits.length === 0) return null
  const finish = finishPoint(distance)
  if (distance?.finishControlPoint != null && finish) controlPointByNumber.set(distance.finishControlPoint, finish)
  const route = [startPoint(distance), ...splits.map((s) => controlPointByNumber.get(s.controlPoint) ?? null)]
  let sum = 0
  for (let i = 1; i < route.length; i++) {
    sum += controlPointDistanceMeters(route[i - 1], route[i]) ?? 0
  }
  return sum > 0 ? sum : null
}

/** Перегон короче этого не участвует в рейтинге — см. isRankableLeg в buildSplitsTable. */
const MIN_RANKABLE_LEG_MS = 1000

/**
 * Последовательность КП колонок таблицы (FORWARD/MARKING).
 *
 * Берётся из дистанции (КП + финиш), если у неё задан финишный КП. Иначе — самая частая
 * последовательность отметок среди финишировавших (при равенстве — самая короткая): у отдельного
 * финишировавшего могут быть лишние отметки (отметил чужой КП, потом нашёл свой), и раньше, когда
 * колонки брались по самому длинному результату, такой участник сдвигал всю таблицу. Если
 * финишировавших нет — самый длинный результат группы.
 */
function courseSequence(pairs: { result: OrienteeringResult | null }[], distance: Distance | undefined): number[] {
  if (distance?.finishControlPoint != null && distance.controlPoints.length > 0) {
    return [...distance.controlPoints.map((cp) => cp.number), distance.finishControlPoint]
  }
  const counts = new Map<string, { sequence: number[]; count: number }>()
  for (const { result } of pairs) {
    if (result?.status !== 'FINISHED' || !result.splits?.length) continue
    const sequence = result.splits.map((s) => s.controlPoint)
    const key = sequence.join(',')
    const entry = counts.get(key)
    if (entry) entry.count++
    else counts.set(key, { sequence, count: 1 })
  }
  const best = [...counts.values()].sort((a, b) => b.count - a.count || a.sequence.length - b.sequence.length)[0]
  if (best) return best.sequence
  return pairs
    .map(({ result }) => result?.splits ?? [])
    .reduce<SplitTime[]>((longest, splits) => (splits.length > longest.length ? splits : longest), [])
    .map((s) => s.controlPoint)
}

/**
 * Сопоставляет отметки участника с КП дистанции: для каждой позиции cpOrder — первая ещё не
 * использованная отметка этого КП после предыдущей сопоставленной (тот же последовательный поиск,
 * что и при проверке прохождения дистанции). Лишние отметки в таблицу не попадают, у пропущенного
 * КП — null; повторяющиеся КП (петли) получают каждое своё вхождение.
 */
function matchToCourse(splits: SplitTime[], cpOrder: number[]): (SplitTime | null)[] {
  let searchIndex = 0
  return cpOrder.map((cp) => {
    for (let i = searchIndex; i < splits.length; i++) {
      if (splits[i].controlPoint === cp) {
        searchIndex = i + 1
        return splits[i]
      }
    }
    return null
  })
}

/**
 * Строит сравнительную таблицу сплитов по группе участников.
 *
 * Для FORWARD/MARKING колонки — КП дистанции по порядку (см. courseSequence), отметки участника
 * раскладываются по ним последовательным поиском (см. matchToCourse): лишние отметки не сдвигают
 * строку, у пропущенного КП ячейка пустая, петли в дистанции обрабатываются корректно. В рейтинг
 * перегона/общего времени попадают только сравнимые значения — без пропусков перед КП и без
 * перегонов короче секунды.
 *
 * Для BY_CHOICE у каждого участника свой набор и порядок КП: колонки строятся по позиции
 * (1..максимум сплитов в группе), а какой именно КП стоит за каждой позицией у конкретного
 * участника — заполняется в SplitsTableCell.controlPoint. Ранги/лучший перегон/темп не считаются.
 */
export function buildSplitsTable(
  participants: OrienteeringParticipant[],
  results: OrienteeringResult[],
  distance?: Distance,
  direction = 'FORWARD',
): SplitsTable {
  const resultByParticipantId = new Map(results.map((r) => [r.participantId, r]))
  const pairs = participants.map((p) => ({ participant: p, result: withRaceSplits(p, resultByParticipantId.get(p.id)) }))

  if (direction === 'BY_CHOICE') {
    const scoreByNumber = new Map((distance?.controlPoints ?? []).map((cp) => [cp.number, cp.score]))
    const maxSplitsCount = Math.max(0, ...pairs.map(({ result }) => result?.splits?.length ?? 0))
    const columns: SplitsTableColumn[] = Array.from({ length: maxSplitsCount }, (_, i) => ({ positionIndex: i + 1, controlPoint: 0 }))

    const rows: SplitsTableRow[] = pairs.map(({ participant, result }) => {
      const splits = result?.splits ?? []
      const startTs = anchorStartTime(participant, result)

      const cells: SplitsTableCell[] = Array.from({ length: maxSplitsCount }, (_, i) => {
        if (startTs == null || i >= splits.length) {
          return { deltaSeconds: null, cumulativeSeconds: null, deltaRank: null, cumulativeRank: null, isBestLeg: false, paceMinPerKm: null, controlPoint: null }
        }
        const splitTs = splits[i].timestamp
        const prevTs = i === 0 ? startTs : splits[i - 1].timestamp
        return {
          deltaSeconds: (splitTs - prevTs) / 1000,
          cumulativeSeconds: (splitTs - startTs) / 1000,
          deltaRank: null,
          cumulativeRank: null,
          isBestLeg: false,
          paceMinPerKm: null,
          controlPoint: splits[i].controlPoint,
        }
      })

      return {
        participant,
        result,
        cells,
        rawScore: rawByChoiceScore(result, scoreByNumber),
        totalDistanceMeters: byChoiceDistanceMeters(splits, distance),
      }
    })

    return { columns, rows }
  }

  const cpOrder = courseSequence(pairs, distance)
  const columns: SplitsTableColumn[] = cpOrder.map((cp, i) => ({ positionIndex: i + 1, controlPoint: cp }))
  const legLengths = legLengthsMeters(distance, cpOrder)
  const matchedByParticipantId = new Map(pairs.map(({ participant, result }) => [participant.id, matchToCourse(result?.splits ?? [], cpOrder)]))

  /** Время отметки предыдущего взятого КП дистанции до позиции i, либо старт. */
  const prevTimestamp = (matched: (SplitTime | null)[], i: number, startTs: number): number => {
    for (let j = i - 1; j >= 0; j--) {
      const split = matched[j]
      if (split) return split.timestamp
    }
    return startTs
  }

  /**
   * Перегон на позицию i сравним с другими: взяты и этот КП, и предыдущий по дистанции, а сам перегон
   * не короче секунды. Отметки быстрее секунды не бывает — это КП, засчитанный организатором вручную
   * с временем предыдущей отметки (кнопка «Засчитать» на экране считывания чипа в Android).
   */
  const isRankableLeg = (matched: (SplitTime | null)[], i: number, startTs: number): boolean => {
    const split = matched[i]
    if (!split) return false
    if (i > 0 && !matched[i - 1]) return false
    return split.timestamp - prevTimestamp(matched, i, startTs) >= MIN_RANKABLE_LEG_MS
  }

  /** Ранги среди участников, для которых measure вернула время (> 0). */
  const ranks = (measure: (matched: (SplitTime | null)[], startTs: number) => number | null): Map<string, number> =>
    new Map(
      pairs
        .map(({ participant, result }) => {
          const startTs = anchorStartTime(participant, result)
          if (startTs == null) return null
          const value = measure(matchedByParticipantId.get(participant.id) ?? [], startTs)
          return value != null && value > 0 ? ([participant.id, value] as const) : null
        })
        .filter((v): v is readonly [string, number] => v != null)
        .sort((a, b) => a[1] - b[1])
        .map(([id], rank) => [id, rank + 1] as const),
    )

  // Общее время на КП сравнимо, только если все КП до него взяты: у снятого с пропуском иначе
  // оказывалось бы «лучшее» время на следующих КП.
  const cumulRanks = cpOrder.map((_, i) =>
    ranks((matched, startTs) => {
      const split = matched[i]
      if (!split || matched.slice(0, i).some((m) => !m) || !isRankableLeg(matched, i, startTs)) return null
      return split.timestamp - startTs
    }),
  )

  const deltaRanks = cpOrder.map((_, i) =>
    ranks((matched, startTs) => {
      const split = matched[i]
      if (!split || !isRankableLeg(matched, i, startTs)) return null
      return split.timestamp - prevTimestamp(matched, i, startTs)
    }),
  )

  const rows: SplitsTableRow[] = pairs.map(({ participant, result }) => {
    const matched = matchedByParticipantId.get(participant.id) ?? []
    const startTs = anchorStartTime(participant, result)

    const cells: SplitsTableCell[] = cpOrder.map((_, i) => {
      const split = matched[i]
      if (startTs == null || !split) {
        return { deltaSeconds: null, cumulativeSeconds: null, deltaRank: null, cumulativeRank: null, isBestLeg: false, paceMinPerKm: null, controlPoint: null }
      }
      const cumulSec = (split.timestamp - startTs) / 1000
      const deltaSec = (split.timestamp - prevTimestamp(matched, i, startTs)) / 1000
      const cumulativeRank = cumulRanks[i].get(participant.id) ?? null
      const deltaRank = deltaRanks[i].get(participant.id) ?? null
      // Темп — только для перегонов, попавших в рейтинг: у перегона через пропущенный КП он бессмыслен.
      const pace = deltaRank != null ? paceMinPerKm(deltaSec, legLengths[i] ?? null) : null

      return { deltaSeconds: deltaSec, cumulativeSeconds: cumulSec, deltaRank, cumulativeRank, isBestLeg: deltaRank === 1, paceMinPerKm: pace, controlPoint: null }
    })

    return { participant, result, cells, rawScore: null, totalDistanceMeters: null }
  })

  return { columns, rows }
}

/**
 * Строит данные графика гонки (отставание от "виртуального" лидера — минимальное кумулятивное
 * время на каждом КП среди финишировавших) из уже построенной таблицы сплитов. Участники не в
 * статусе FINISHED исключаются. Каждая кривая начинается с синтетической точки старта
 * (positionIndex=0, deltaSeconds=0) — все участники стартуют вместе.
 */
export function buildRaceGraphData(table: SplitsTable): RaceGraphData {
  const finishedRows = table.rows.filter((r) => r.result?.status === 'FINISHED')

  const leaderCumulativeByColumn = table.columns.map((_, i) => {
    const values = finishedRows.map((r) => r.cells[i]?.cumulativeSeconds).filter((v): v is number => v != null)
    return values.length > 0 ? Math.min(...values) : null
  })

  const series: RaceGraphSeries[] = finishedRows.map((row) => {
    const points: RaceGraphPoint[] = [{ positionIndex: 0, controlPoint: 0, deltaSeconds: 0 }]
    table.columns.forEach((column, i) => {
      const cumulative = row.cells[i]?.cumulativeSeconds ?? null
      const leader = leaderCumulativeByColumn[i]
      points.push({
        positionIndex: column.positionIndex,
        controlPoint: column.controlPoint,
        deltaSeconds: cumulative != null && leader != null ? cumulative - leader : null,
      })
    })
    return { participant: row.participant, result: row.result, points }
  })

  return { columns: table.columns, series }
}

/**
 * Строит данные графика набора очков во времени для BY_CHOICE (score-О). Не финишировавшие
 * исключаются. Если участник финишировал позже последней отметки — добавляется финальная плоская
 * точка на totalTime, чтобы линия доходила до конца гонки.
 */
export function buildScoreGraphData(
  participants: OrienteeringParticipant[],
  results: OrienteeringResult[],
  distance?: Distance,
  timeLimitMinutes?: number | null,
): ScoreGraphData {
  const scoreByNumber = new Map((distance?.controlPoints ?? []).map((cp) => [cp.number, cp.score]))
  const resultByParticipantId = new Map(results.map((r) => [r.participantId, r]))
  const timeLimitSeconds = timeLimitMinutes != null && timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null

  const series = participants
    .map((participant) => {
      const result = resultByParticipantId.get(participant.id)
      if (!result || result.status !== 'FINISHED') return null
      const startTs = anchorStartTime(participant, result)
      if (startTs == null) return null

      const rawPoints: ScoreGraphPoint[] = [{ elapsedSeconds: 0, cumulativeScore: 0 }]
      let cumulative = 0
      for (const split of partitionSplitsByStart(result.splits, startTs).race) {
        cumulative += scoreByNumber.get(split.controlPoint) ?? 0
        rawPoints.push({ elapsedSeconds: (split.timestamp - startTs) / 1000, cumulativeScore: cumulative })
      }
      const finishSeconds = result.totalTime
      if (finishSeconds != null && finishSeconds > rawPoints[rawPoints.length - 1].elapsedSeconds) {
        rawPoints.push({ elapsedSeconds: finishSeconds, cumulativeScore: cumulative })
      }

      const deduction = Math.max(0, cumulative - (result.totalScore ?? cumulative))
      const points = applyLatePenalty(rawPoints, timeLimitSeconds, deduction)

      return { participant, result, points }
    })
    .filter((s) => s !== null) as ScoreGraphSeries[]

  return { series, timeLimitSeconds }
}

/**
 * Применяет линейно нарастающий штраф за опоздание к "сырой" кривой очков: до timeLimitSeconds
 * кривая не меняется, после — вычитается штраф, линейно растущий от 0 в момент истечения лимита
 * до totalDeduction в момент финиша.
 */
function applyLatePenalty(rawPoints: ScoreGraphPoint[], timeLimitSeconds: number | null, totalDeduction: number): ScoreGraphPoint[] {
  const finishSeconds = rawPoints[rawPoints.length - 1].elapsedSeconds
  if (timeLimitSeconds == null || totalDeduction <= 0 || finishSeconds <= timeLimitSeconds) return rawPoints

  const rampSpan = finishSeconds - timeLimitSeconds
  const deductionAt = (t: number) => (t <= timeLimitSeconds ? 0 : Math.trunc((totalDeduction * (t - timeLimitSeconds)) / rampSpan))

  const result: ScoreGraphPoint[] = []
  let boundaryInserted = false
  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i]
    if (p.elapsedSeconds <= timeLimitSeconds) {
      result.push(p)
    } else {
      if (!boundaryInserted) {
        result.push({ elapsedSeconds: timeLimitSeconds, cumulativeScore: rawPoints[i - 1].cumulativeScore })
        boundaryInserted = true
      }
      result.push({ elapsedSeconds: p.elapsedSeconds, cumulativeScore: Math.max(0, p.cumulativeScore - deductionAt(p.elapsedSeconds)) })
    }
  }
  return result
}
