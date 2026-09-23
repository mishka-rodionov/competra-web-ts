import L from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { cornersToBounds, type MapCorners } from '../lib/mapCorners'

/** Приватный API Leaflet, который нужен для анимации зума (его нет в @types/leaflet). */
interface MapInternals {
  _latLngToNewLayerPoint(latlng: L.LatLngExpression, zoom: number, center: L.LatLng): L.Point
}

/**
 * Растровый слой, привязанный к трём углам (верхний левый, верхний правый, нижний левый), —
 * в отличие от штатного `L.ImageOverlay`, который умеет только прямоугольник «север вверх».
 * Нужен для карт ориентирования, нарисованных под магнитный север: растр повёрнут относительно
 * OSM, и втискивание его в bbox сдвигает местность на десятки метров.
 *
 * Как и штатный слой, картинка лежит в overlayPane, но вместо `setPosition` + width/height ей
 * задаётся CSS-матрица, переводящая пиксели растра в пиксели слоя карты по трём углам. На
 * анимации зума та же матрица считается для целевого зума — CSS-переход Leaflet
 * (`.leaflet-zoom-animated`) плавно доводит её, как у стандартных оверлеев.
 */
class RotatedImageLayer extends L.ImageOverlay {
  private readonly corners: MapCorners

  constructor(url: string, corners: MapCorners, options?: L.ImageOverlayOptions) {
    super(url, L.latLngBounds(cornersToBounds(corners)), options)
    this.corners = corners
    // До загрузки naturalWidth/naturalHeight = 0 — матрицу можно посчитать только после load.
    this.on('load', () => this._reset())
  }

  /** Вызывается Leaflet'ом на zoom/viewreset и из onAdd. */
  _reset() {
    const map = this.getMap()
    if (!map) return
    this.applyTransform((latLng) => map.latLngToLayerPoint(latLng))
  }

  /** Вызывается Leaflet'ом на zoomanim (если включена анимация зума). */
  _animateZoom(e: L.ZoomAnimEvent) {
    const map = this.getMap() as (L.Map & MapInternals) | undefined
    if (!map) return
    this.applyTransform((latLng) => map._latLngToNewLayerPoint(latLng, e.zoom, e.center))
  }

  private getMap(): L.Map | undefined {
    return (this as unknown as { _map?: L.Map })._map
  }

  private applyTransform(toLayerPoint: (latLng: L.LatLngTuple) => L.Point) {
    const image = this.getElement()
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) return

    const width = image.naturalWidth
    const height = image.naturalHeight
    const topLeft = toLayerPoint(this.corners.topLeft)
    const topRight = toLayerPoint(this.corners.topRight)
    const bottomLeft = toLayerPoint(this.corners.bottomLeft)

    // matrix(a, b, c, d, e, f): (x, y) → (a·x + c·y + e, b·x + d·y + f), начало — левый верхний
    // угол картинки. (0,0) → topLeft, (width,0) → topRight, (0,height) → bottomLeft.
    const a = (topRight.x - topLeft.x) / width
    const b = (topRight.y - topLeft.y) / width
    const c = (bottomLeft.x - topLeft.x) / height
    const d = (bottomLeft.y - topLeft.y) / height

    image.style.width = `${width}px`
    image.style.height = `${height}px`
    image.style.transformOrigin = '0 0'
    image.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${topLeft.x}, ${topLeft.y})`
  }
}

interface RotatedImageOverlayProps {
  url: string
  corners: MapCorners
}

/** React-обёртка над {@link RotatedImageLayer} для использования внутри `<MapContainer>`. */
export function RotatedImageOverlay({ url, corners }: RotatedImageOverlayProps) {
  const map = useMap()
  const cornersKey = JSON.stringify(corners)

  useEffect(() => {
    const layer = new RotatedImageLayer(url, corners).addTo(map)
    return () => {
      layer.remove()
    }
    // cornersKey — стабильный по значению суррогат для corners (объект пересоздаётся на каждый рендер).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, url, cornersKey])

  return null
}
