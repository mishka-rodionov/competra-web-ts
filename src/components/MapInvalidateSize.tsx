import type { FitBoundsOptions, LatLngBoundsExpression } from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

interface MapInvalidateSizeProps {
  /**
   * Если задано, карта не только пересчитает размер контейнера, но и заново впишет вид в эти
   * границы. Нужно потому, что `bounds` в `<MapContainer>` применяется только один раз при
   * монтировании — если на тот момент контейнер ещё не получил финальный размер от
   * flex-раскладки, исходный fitBounds считается по неверному размеру (например, даёт
   * экстремальный зум), а один только invalidateSize() эту рамку не пересчитывает — он лишь
   * обновляет размер, сохраняя текущий центр/зум.
   */
  bounds?: LatLngBoundsExpression
  boundsOptions?: FitBoundsOptions
}

/**
 * Leaflet измеряет размер контейнера в момент инициализации и дальше не отслеживает его сам —
 * если карта монтируется внутри flex/grid-раскладки, где итоговая высота контейнера
 * устанавливается уже после первого layout-прохода, карта может закэшировать нулевой или
 * неверный размер и остаться пустой. Разовый пересчёт на следующий кадр после монтирования —
 * стандартный обходной путь для react-leaflet в такой раскладке.
 *
 * Важно: НЕ через ResizeObserver на контейнере карты — invalidateSize() сам может привести
 * к микроскопическому изменению измеряемого размера (округление/скроллбар/anti-aliasing),
 * из-за чего ResizeObserver реагирует на собственный вызов и уходит в бесконечный цикл
 * перезагрузки тайлов (см. историю: воспроизвелось на реальных данных).
 */
export function MapInvalidateSize({ bounds, boundsOptions }: MapInvalidateSizeProps = {}) {
  const map = useMap()
  const boundsKey = bounds ? JSON.stringify(bounds) : undefined

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      map.invalidateSize()
      if (bounds) map.fitBounds(bounds, boundsOptions)
    })
    return () => cancelAnimationFrame(raf)
    // boundsKey — стабильный по значению суррогат для bounds/boundsOptions (обычные литералы,
    // пересоздаются на каждый рендер по ссылке); эффект должен перезапускаться только когда
    // реально меняются сами координаты, а не на каждый ре-рендер родителя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey])

  return null
}
