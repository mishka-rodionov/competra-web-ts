import { isMinControls, minControlsLabel, ranksByScore } from '../../lib/byChoiceMode'
import { isRequiredControl } from '../../lib/controlPoints'
import { controlPointDistanceMeters } from '../../lib/splitsTable'
import type { Distance } from '../../types/distance'

/**
 * Поля дистанции, которые показывает окно: сохранённая дистанция ([Distance]) или ещё не
 * опубликованная из мастера ([PendingDistance] — у неё нет координат старта и финиша).
 */
export type DistanceDetails = Pick<
  Distance,
  'name' | 'lengthMeters' | 'climbMeters' | 'description' | 'controlPoints' | 'finishControlPoint' | 'startControlPoint' | 'minControlsCount'
> &
  Partial<Pick<Distance, 'startLatitude' | 'startLongitude' | 'finishLatitude' | 'finishLongitude'>>

interface DistanceDetailsDialogProps {
  distance: DistanceDetails
  direction: string
  byChoiceMode: string
  onDismiss: () => void
}

type GeoPoint = { latitude: number | null; longitude: number | null }

/** Строка таблицы: старт, КП дистанции по порядку или финиш. */
interface Row {
  key: string
  /** «Старт» / порядковый номер КП / «Финиш». */
  label: string
  /** Номер станции; у старта и финиша — только если он задан. */
  number: number | null
  score: number | null
  isRequired: boolean
  point: GeoPoint
}

function hasCoordinates(point: GeoPoint): boolean {
  return point.latitude != null && point.longitude != null
}

/** «КП 34, 35, финиш» — у чего из дистанции нет координат. */
function missingCoordinatesLabel(rows: Row[]): string {
  const missing = rows.filter((row) => !hasCoordinates(row.point))
  const controls = missing.filter((row) => row.key.startsWith('cp-')).map((row) => row.number)
  return [
    missing.some((row) => row.key === 'start') ? 'старт' : null,
    controls.length > 0 ? `КП ${controls.join(', ')}` : null,
    missing.some((row) => row.key === 'finish') ? 'финиш' : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Подробности дистанции для организатора: порядок КП и загрузились ли у них координаты — чтобы
 * после создания вручную или импорта IOF XML было видно, что дистанция загрузилась как надо.
 * Сами координаты организатору ничего не говорят, поэтому вместо чисел — отметка у строки и
 * сводка о том, на что координаты влияют. Отсутствие координат — предупреждение, а не ошибка:
 * провести соревнование оно не мешает. Длины перегонов (по прямой) считаются только для дистанций
 * с заданным порядком — те же, по которым строится темп в сплитах (`splitsTable.ts`).
 */
export function DistanceDetailsDialog({ distance, direction, byChoiceMode, onDismiss }: DistanceDetailsDialogProps) {
  const isByChoice = direction === 'BY_CHOICE'
  const hasScores = ranksByScore(direction, byChoiceMode)
  const hasMinControls = isMinControls(direction, byChoiceMode)
  const controlPoints = distance.controlPoints
  const start: GeoPoint = { latitude: distance.startLatitude ?? null, longitude: distance.startLongitude ?? null }
  const finish: GeoPoint = { latitude: distance.finishLatitude ?? null, longitude: distance.finishLongitude ?? null }

  const rows: Row[] = [
    { key: 'start', label: 'Старт', number: distance.startControlPoint, score: null, isRequired: false, point: start },
    ...controlPoints.map(
      (cp, i): Row => ({
        key: `cp-${i}`,
        label: `${i + 1}`,
        number: cp.number,
        score: cp.score,
        isRequired: isByChoice && isRequiredControl(cp),
        point: cp,
      }),
    ),
    { key: 'finish', label: 'Финиш', number: distance.finishControlPoint, score: null, isRequired: false, point: finish },
  ]
  // Перегон i-й строки — от предыдущей строки; в «по выбору» порядка нет, перегоны не считаем.
  const legs = rows.map((row, i) => (i === 0 || isByChoice ? null : controlPointDistanceMeters(rows[i - 1].point, row.point)))
  const showLegs = legs.some((leg) => leg != null)
  const totalLegsMeters = legs.every((leg, i) => i === 0 || leg != null)
    ? legs.reduce<number>((sum, leg) => sum + (leg ?? 0), 0)
    : null

  // Ни одной координаты — дистанция создана вручную: колонка из одних «нет координат» не нужна.
  const hasAnyCoordinates = rows.some((row) => hasCoordinates(row.point))
  const missingLabel = missingCoordinatesLabel(rows)

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div
        role="dialog"
        aria-label={distance.name ?? 'Дистанция'}
        className="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-medium text-fg">{distance.name ?? 'Без названия'}</h3>
          <button type="button" onClick={onDismiss} aria-label="Закрыть" className="px-2 text-xl text-on-surface-variant">
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg">
          <span>Длина: {distance.lengthMeters > 0 ? `${distance.lengthMeters} м` : '—'}</span>
          <span>Набор: {distance.climbMeters > 0 ? `${distance.climbMeters} м` : '—'}</span>
          <span>КП: {controlPoints.length}</span>
        </div>
        {hasMinControls && <span className="text-sm text-fg">{minControlsLabel(distance.minControlsCount, controlPoints.length)}</span>}
        {distance.description && <p className="text-sm text-on-surface-variant">{distance.description}</p>}
        {controlPoints.length > 0 &&
          (!hasAnyCoordinates ? (
            <p className="text-sm text-on-surface-variant">
              Координат нет — дистанция создана вручную или в файле их не было. Провести соревнование это не мешает, но длины
              перегонов и темп в сплитах не посчитаются.
            </p>
          ) : missingLabel ? (
            <p className="text-sm text-warning">
              Нет координат: {missingLabel}. На этих перегонах не посчитаются длина и темп в сплитах — провести соревнование это
              не мешает.
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Координаты загружены у старта, финиша и всех КП. По ним считаются длины перегонов и темп в сплитах, а КП видны на
              карте онлайн-треков.
            </p>
          ))}

        {controlPoints.length === 0 ? (
          <p className="text-sm text-error">У дистанции нет ни одного КП</p>
        ) : (
          <>
            {isByChoice && <p className="text-sm text-on-surface-variant">Порядок свободный — КП в том виде, как они записаны в дистанции.</p>}
            {/* shrink-0: иначе flex-колонка с max-h сжимает обёртку (overflow ≠ visible) и обрезает строки таблицы. */}
            <div className="shrink-0 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
                    <th className="py-1 pr-2 font-normal">#</th>
                    <th className="py-1 pr-2 font-normal">КП</th>
                    {hasScores && <th className="py-1 pr-2 font-normal">Баллы</th>}
                    {hasAnyCoordinates && <th className="py-1 pr-2 font-normal">Координаты</th>}
                    {showLegs && <th className="py-1 text-right font-normal">Перегон</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isEdge = row.key === 'start' || row.key === 'finish'
                    const leg = legs[i]
                    return (
                      <tr key={row.key} className="border-b border-outline-variant last:border-0">
                        <td className={`py-1 pr-2 ${isEdge ? 'text-on-surface-variant' : 'text-fg'}`}>{row.label}</td>
                        <td className="py-1 pr-2 font-medium text-fg">
                          {row.number ?? (isEdge ? '' : '—')}
                          {row.isRequired && <span className="ml-1 text-xs font-normal text-primary">обяз.</span>}
                        </td>
                        {hasScores && <td className="py-1 pr-2 text-fg">{row.score ?? ''}</td>}
                        {hasAnyCoordinates && (
                          <td className="py-1 pr-2 whitespace-nowrap">
                            {hasCoordinates(row.point) ? (
                              // Числа — только во всплывающей подсказке: организатору важен сам факт.
                              <span className="text-primary" title={`${row.point.latitude!.toFixed(5)}, ${row.point.longitude!.toFixed(5)}`}>
                                ✓
                              </span>
                            ) : (
                              <span className="text-warning">нет координат</span>
                            )}
                          </td>
                        )}
                        {showLegs && (
                          <td className="py-1 text-right whitespace-nowrap text-on-surface-variant">
                            {leg != null ? `${Math.round(leg)} м` : ''}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {showLegs && totalLegsMeters != null && (
              <p className="text-sm text-on-surface-variant">
                По прямой через все КП: {Math.round(totalLegsMeters)} м
                {distance.lengthMeters > 0 && ` · длина дистанции — ${distance.lengthMeters} м`}
              </p>
            )}
          </>
        )}

        <button type="button" onClick={onDismiss} className="mt-2 rounded-md border border-outline px-4 py-2 text-sm text-fg">
          Закрыть
        </button>
      </div>
    </div>
  )
}
