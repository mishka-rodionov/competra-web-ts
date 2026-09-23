import type { Distance } from '../types/distance'

/** Точка WGS84 в порядке Leaflet: `[lat, lng]`. */
export type LatLngTuple = [number, number]

/** Четыре угла растровой карты дистанции в WGS84. */
export interface MapCorners {
  topLeft: LatLngTuple
  topRight: LatLngTuple
  bottomRight: LatLngTuple
  bottomLeft: LatLngTuple
}

type DistanceMapFields = Pick<
  Distance,
  'mapUrl' | 'mapTopLeftLat' | 'mapTopLeftLng' | 'mapTopRightLat' | 'mapTopRightLng' | 'mapBottomRightLat' | 'mapBottomRightLng'
>

/**
 * Углы карты дистанции или `null`, если карта не прикреплена полностью.
 *
 * Две схемы привязки:
 * - заполнен верхний правый угол → верхний левый и нижний правый — **точные** углы растра
 *   (привязка по трём точкам из mapper, карта может быть повёрнута на магнитное склонение);
 *   нижний левый достраивается как `TL + BR − TR`;
 * - верхний правый угол пуст → старые данные: верхний левый и нижний правый — bbox
 *   «север строго вверх».
 */
export function distanceMapCorners(distance: DistanceMapFields): MapCorners | null {
  const { mapUrl, mapTopLeftLat, mapTopLeftLng, mapTopRightLat, mapTopRightLng, mapBottomRightLat, mapBottomRightLng } = distance
  if (mapUrl == null || mapTopLeftLat == null || mapTopLeftLng == null || mapBottomRightLat == null || mapBottomRightLng == null) {
    return null
  }

  const topLeft: LatLngTuple = [mapTopLeftLat, mapTopLeftLng]
  const bottomRight: LatLngTuple = [mapBottomRightLat, mapBottomRightLng]

  if (mapTopRightLat != null && mapTopRightLng != null) {
    const topRight: LatLngTuple = [mapTopRightLat, mapTopRightLng]
    const bottomLeft: LatLngTuple = [topLeft[0] + bottomRight[0] - topRight[0], topLeft[1] + bottomRight[1] - topRight[1]]
    return { topLeft, topRight, bottomRight, bottomLeft }
  }

  return {
    topLeft,
    topRight: [mapTopLeftLat, mapBottomRightLng],
    bottomRight,
    bottomLeft: [mapBottomRightLat, mapTopLeftLng],
  }
}

/** Все четыре угла списком — для fitBounds/LatLngBounds. */
export function cornersToBounds(corners: MapCorners): LatLngTuple[] {
  return [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
}
