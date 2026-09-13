import type { OrienteeringParticipant, OrienteeringResult } from './participant'

/** Колонка таблицы сплитов — один контрольный пункт по позиции в дистанции (не по номеру КП). */
export interface SplitsTableColumn {
  positionIndex: number
  controlPoint: number
}

/** Ячейка таблицы сплитов для одного участника на одном КП. */
export interface SplitsTableCell {
  deltaSeconds: number | null
  cumulativeSeconds: number | null
  deltaRank: number | null
  cumulativeRank: number | null
  isBestLeg: boolean
  paceMinPerKm: number | null
  /** Номер КП, реально взятого участником на этой позиции (BY_CHOICE — у каждого свой порядок). */
  controlPoint: number | null
}

/** Строка таблицы сплитов — один участник группы. */
export interface SplitsTableRow {
  participant: OrienteeringParticipant
  result: OrienteeringResult | null
  cells: SplitsTableCell[]
  /** Сырые очки за фактически взятые КП (BY_CHOICE), ДО вычета штрафа. Null для FORWARD/MARKING. */
  rawScore: number | null
  /** Дистанция, пройденная участником (BY_CHOICE), в метрах. Null для FORWARD/MARKING. */
  totalDistanceMeters: number | null
}

export interface SplitsTable {
  columns: SplitsTableColumn[]
  rows: SplitsTableRow[]
}

/** Точка графика гонки для одного КП: отставание участника от лидера в секундах. */
export interface RaceGraphPoint {
  positionIndex: number
  controlPoint: number
  deltaSeconds: number | null
}

/** Кривая отставания от лидера для одного участника по всем КП дистанции. */
export interface RaceGraphSeries {
  participant: OrienteeringParticipant
  result: OrienteeringResult | null
  points: RaceGraphPoint[]
}

export interface RaceGraphData {
  columns: SplitsTableColumn[]
  series: RaceGraphSeries[]
}

/** Точка графика набора очков (BY_CHOICE): момент времени от старта и накопленные очки на этот момент. */
export interface ScoreGraphPoint {
  elapsedSeconds: number
  cumulativeScore: number
}

/** Кривая набора очков во времени для одного участника (BY_CHOICE). */
export interface ScoreGraphSeries {
  participant: OrienteeringParticipant
  result: OrienteeringResult | null
  points: ScoreGraphPoint[]
}

export interface ScoreGraphData {
  series: ScoreGraphSeries[]
  /** Контрольное время группы в секундах от старта. Null, если у группы нет ограничения по времени. */
  timeLimitSeconds: number | null
}
