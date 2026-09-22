import L from 'leaflet'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

/**
 * Vite не резолвит относительные пути дефолтной иконки Leaflet (шитой под webpack) — подставляем их
 * через import. Именно отдельной L.icon, а не L.Icon.Default.mergeOptions: Default сам приклеивает
 * к iconUrl путь к картинкам, найденный через CSS, и получался двойной путь (…/images//node_modules/…),
 * из-за чего пин маркера молча не загружался.
 */
L.Marker.prototype.options.icon = L.icon({
  ...L.Icon.Default.prototype.options,
  iconRetinaUrl: marker2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

/**
 * Префикс подписи карты по умолчанию (Leaflet ≥ 1.8) содержит флаг Украины перед ссылкой
 * на Leaflet — оставляем только ссылку. Атрибуция OpenStreetMap задаётся в TileLayer и не меняется.
 */
L.Control.Attribution.mergeOptions({
  prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">Leaflet</a>',
})
