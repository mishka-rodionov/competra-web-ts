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

/** Расстояние между двумя КП по WGS84 (haversine), в метрах. Null, если у одного из КП нет координат. */
export function controlPointDistanceMeters(from: ControlPoint | null | undefined, to: ControlPoint | null | undefined): number | null {
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

/** Длина перегона (м) для каждой позиции cpOrder: null для первой позиции и там, где нет координат. */
function legLengthsMeters(distance: Distance | undefined, cpOrder: number[]): (number | null)[] {
  const expected = distance?.controlPoints
  if (!expected) return cpOrder.map(() => null)
  return cpOrder.map((_, i) => (i === 0 ? null : controlPointDistanceMeters(expected[i - 1], expected[i])))
}

function anchorStartTime(participant: OrienteeringParticipant, result: OrienteeringResult | null): number | null {
  return result?.startTime ?? participant.startTime
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
 * Дистанция, пройденная участником (BY_CHOICE), в метрах — сумма расстояний между
 * последовательно взятыми КП по их координатам. Первый взятый КП не учитывается — координата
 * точки старта неизвестна. Перегоны с неизвестными координатами в сумму не входят.
 */
function byChoiceDistanceMeters(splits: SplitTime[], controlPointByNumber: Map<number, ControlPoint>): number | null {
  if (controlPointByNumber.size === 0 || splits.length < 2) return null
  let sum = 0
  for (let i = 1; i < splits.length; i++) {
    const from = controlPointByNumber.get(splits[i - 1].controlPoint)
    const to = controlPointByNumber.get(splits[i].controlPoint)
    sum += controlPointDistanceMeters(from, to) ?? 0
  }
  return sum > 0 ? sum : null
}

/**
 * Строит сравнительную таблицу сплитов по группе участников.
 *
 * Для FORWARD/MARKING колонки берутся из самого длинного массива splits среди участников
 * (позиционно, а не по номеру КП — корректно работает и с петлями в дистанции), с рангами и
 * лучшим перегоном.
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
  const pairs = participants.map((p) => ({ participant: p, result: resultByParticipantId.get(p.id) ?? null }))

  if (direction === 'BY_CHOICE') {
    const scoreByNumber = new Map((distance?.controlPoints ?? []).map((cp) => [cp.number, cp.score]))
    const controlPointByNumber = new Map((distance?.controlPoints ?? []).map((cp) => [cp.number, cp]))
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
        totalDistanceMeters: byChoiceDistanceMeters(splits, controlPointByNumber),
      }
    })

    return { columns, rows }
  }

  const cpOrder = pairs
    .map(({ result }) => result?.splits)
    .filter((splits): splits is SplitTime[] => !!splits)
    .reduce<SplitTime[]>((longest, splits) => (splits.length > longest.length ? splits : longest), [])
    .map((s) => s.controlPoint)

  const columns: SplitsTableColumn[] = cpOrder.map((cp, i) => ({ positionIndex: i + 1, controlPoint: cp }))
  const legLengths = legLengthsMeters(distance, cpOrder)

  const cumulRanks: Map<string, number>[] = cpOrder.map((_, i) =>
    new Map(
      pairs
        .map(({ participant, result }) => {
          const splits = result?.splits
          const startTs = anchorStartTime(participant, result)
          if (!splits || startTs == null || i >= splits.length) return null
          return [participant.id, splits[i].timestamp - startTs] as const
        })
        .filter((v): v is readonly [string, number] => v != null)
        .sort((a, b) => a[1] - b[1])
        .map(([id], rank) => [id, rank + 1] as const),
    ),
  )

  const deltaRanks: Map<string, number>[] = cpOrder.map((_, i) =>
    new Map(
      pairs
        .map(({ participant, result }) => {
          const splits = result?.splits
          const startTs = anchorStartTime(participant, result)
          if (!splits || startTs == null || i >= splits.length) return null
          const prevTs = i === 0 ? startTs : splits[i - 1].timestamp
          return [participant.id, splits[i].timestamp - prevTs] as const
        })
        .filter((v): v is readonly [string, number] => v != null)
        .sort((a, b) => a[1] - b[1])
        .map(([id], rank) => [id, rank + 1] as const),
    ),
  )

  const rows: SplitsTableRow[] = pairs.map(({ participant, result }) => {
    const splits = result?.splits ?? []
    const startTs = anchorStartTime(participant, result)

    const cells: SplitsTableCell[] = cpOrder.map((_, i) => {
      if (startTs == null || i >= splits.length) {
        return { deltaSeconds: null, cumulativeSeconds: null, deltaRank: null, cumulativeRank: null, isBestLeg: false, paceMinPerKm: null, controlPoint: null }
      }
      const splitTs = splits[i].timestamp
      const prevTs = i === 0 ? startTs : splits[i - 1].timestamp
      const cumulSec = (splitTs - startTs) / 1000
      const deltaSec = (splitTs - prevTs) / 1000
      const cumulativeRank = cumulRanks[i].get(participant.id) ?? null
      const deltaRank = deltaRanks[i].get(participant.id) ?? null
      const pace = paceMinPerKm(deltaSec, legLengths[i] ?? null)

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
      for (const split of result.splits ?? []) {
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
