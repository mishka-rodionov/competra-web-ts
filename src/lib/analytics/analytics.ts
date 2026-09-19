import type { createHashRouter } from 'react-router-dom'
import { isDebugEnvironment } from '../debugEnv'
import type { AnalyticsEvent } from './events'
import { screenNameForRoute } from './screens'

type Ym = {
  (counterId: number, method: string, ...args: unknown[]): void
  a?: unknown[][]
  l?: number
}

declare global {
  interface Window {
    ym?: Ym
  }
}

const EVENT_SCREEN_VIEW = 'screen_view'
const METRIKA_SCRIPT = 'https://mc.yandex.ru/metrika/tag.js'

const rawCounterId = Number(import.meta.env.VITE_YM_COUNTER_ID)
const counterId = Number.isInteger(rawCounterId) && rawCounterId > 0 ? rawCounterId : null

const FORCE_FLAG_KEY = 'ymForce'

let enabled = false

function isForcedByFlag(): boolean {
  try {
    const param = new URLSearchParams(location.search).get('ym')
    if (param === '1') localStorage.setItem(FORCE_FLAG_KEY, '1')
    if (param === '0') localStorage.removeItem(FORCE_FLAG_KEY)
    return localStorage.getItem(FORCE_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Продуктовая аналитика поверх Яндекс.Метрики — веб-аналог AppMetrica из competra-android.
 * Работает как no-op, если не задан `VITE_YM_COUNTER_ID` (локальная сборка, форк без секретов)
 * либо включён debug-режим (localhost / `?debug=1`) — чтобы не засорять отчёт разработкой.
 * Принудительно включить счётчик в debug-режиме (проверка доставки) — `?ym=1` в URL, выключить — `?ym=0`;
 * флаг переживает перезагрузку через localStorage. Нужен `VITE_YM_COUNTER_ID` (локально — в `.env.local`),
 * лучше от отдельного тестового счётчика: события уйдут в реальный отчёт.
 * События уходят как цели (`reachGoal`) с параметрами визита; вебвизор и clickmap выключены
 * намеренно: записи сессий захватили бы формы с персональными данными.
 */
function callYm(method: string, ...args: unknown[]) {
  if (!enabled || counterId == null) return
  window.ym?.(counterId, method, ...args)
}

function loadMetrika(id: number) {
  // Стандартный загрузочный сниппет Метрики: очередь вызовов до загрузки tag.js
  const ym: Ym =
    window.ym ?? Object.assign((...args: unknown[]) => void (ym.a ??= []).push(args as never), {})
  window.ym = ym
  ym.l = Date.now()

  const script = document.createElement('script')
  script.async = true
  script.src = METRIKA_SCRIPT
  document.head.appendChild(script)

  // defer: автоматический hit первой страницы отключён — хиты шлём сами на каждую смену маршрута,
  // потому что хэш-роутинг (#/...) автотрекинг Метрики не распознаёт как навигацию.
  ym(id, 'init', {
    defer: true,
    clickmap: false,
    trackLinks: false,
    accurateTrackBounce: true,
    webvisor: false,
  })
}

export const analytics = {
  trackScreen(screenName: string, url: string, referrer: string) {
    callYm('hit', url, { title: screenName, referer: referrer })
    callYm('reachGoal', EVENT_SCREEN_VIEW, { screen: screenName })
    logDebug(EVENT_SCREEN_VIEW, { screen: screenName })
  },

  trackEvent(event: AnalyticsEvent) {
    callYm('reachGoal', event.name, event.params)
    logDebug(event.name, event.params)
  },

  /**
   * Привязывает визиты к пользователю. Очистить связку при logout Метрика не умеет
   * (нельзя сбросить userID), поэтому вызываем только при появлении профиля.
   */
  setUserId(userId: string) {
    callYm('setUserID', userId)
    callYm('userParams', { user_id: userId })
  },
}

function logDebug(name: string, params?: unknown) {
  if (import.meta.env.DEV && isDebugEnvironment()) console.debug('[analytics]', name, params ?? '')
}

/**
 * Подключает счётчик и подписывается на смену маршрута роутера — аналог TrackNavScreens.
 * Хит шлётся только при смене pathname (смена query/hash-параметров того же экрана не в счёт).
 */
export function initAnalytics(router: ReturnType<typeof createHashRouter>) {
  const forced = isForcedByFlag()
  enabled = counterId != null && (forced || !isDebugEnvironment())
  if (forced && counterId == null) console.warn('[analytics] ?ym=1 задан, но VITE_YM_COUNTER_ID не указан')
  if (forced && enabled)
    console.info('[analytics] счётчик Метрики включён принудительно, события уходят в отчёт')
  if (enabled && counterId != null) loadMetrika(counterId)

  let lastPathname: string | null = null
  let lastUrl = document.referrer

  function onNavigation(state: typeof router.state) {
    if (state.navigation.state !== 'idle') return
    if (state.location.pathname === lastPathname) return
    lastPathname = state.location.pathname

    const screen = screenNameForRoute(state.matches.at(-1)?.route.path)
    if (screen == null) return
    const url = window.location.href
    analytics.trackScreen(screen, url, lastUrl)
    lastUrl = url
  }

  onNavigation(router.state)
  router.subscribe(onNavigation)
}
