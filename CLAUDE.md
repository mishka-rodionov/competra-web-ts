# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**competra-web-ts** — веб-приложение для управления соревнованиями по спортивному ориентированию. React 19 + TypeScript + Vite, Tailwind v4, TanStack Query, React Router (hash-based). Деплоится на GitHub Pages по адресу `competra.ru`.

Это переезд с чистого листа с прежнего Kotlin Multiplatform + Compose Wasm веб-клиента (`/Users/rodionov/web_projects/competra-web`, теперь архивный) — тот же дух и дизайн («Лес»: хвойный зелёный + терракота), но код написан заново, без механического портирования 1:1 везде, где веб-специфика подсказывала более простое решение (например, нативные `<input type="date">`/`<input type="file">` вместо кастомных пикеров).

Пакетный менеджер — pnpm. Тестов в проекте нет — `pnpm build` (включает `tsc -b`) и `npx oxlint` служат основной страховкой; проверяй новый функционал вручную в браузере (Browser pane / dev-сервер) на реальных данных бэкенда, не на моках.

## Build Commands

```bash
pnpm dev        # Dev-сервер на :3000 (не 5173 — так исторически разрешён CORS на бэкенде)
pnpm build      # tsc -b && vite build — прод-сборка в dist/
pnpm lint       # oxlint
pnpm format     # prettier --write .
pnpm preview    # Локальный просмотр prod-сборки
```

CI (`.github/workflows/deploy.yml`) на каждый пуш в `master`: `pnpm install --frozen-lockfile` → `pnpm build` → записывает `CNAME` (`competra.ru`) в `dist/` → деплоит через `actions/deploy-pages`.

## Architecture

```
src/
  api/          Репозитории (по одному на сущность) + client.ts (fetch-обёртки) + safeApiCall.ts
  auth/         tokenStorage (реактивное хранилище токена) + useIsLoggedIn
  components/   Общие UI-примитивы (TextInput, LabeledSelect, TabBar, карты Leaflet, ...)
  features/     UI-логика по доменам: auth, clubs, competition-detail, competitions,
                diary, legal, management, profile, ratings
  lib/          Бизнес-логика и утилиты без UI: dateUtils, splitsTable (сплиты/графики),
                trackCodec + gpxParser (GPS-трек), resultsHtmlParser/resultsExcelParser
                + pastResultsImportPlanner (импорт результатов), chartSetup, leafletIcons
  pages/        Компоненты уровня роута (по одному на путь в routes.tsx)
  types/        TS-интерфейсы, зеркалящие модели бэкенда
  routes.tsx    createHashRouter — все маршруты
```

Hash-роутинг (`#/...`) выбран осознанно: GitHub Pages отдаёт статику без server-side rewrite, поэтому прямой заход/обновление страницы на вложенном пути (`/competition/123`) дал бы 404 при обычном `BrowserRouter`. Хэш живёт только в браузере и такой проблемы не создаёт — сервер всегда видит запрос на `/`.

## Key Patterns

**API-ответы**: все эндпоинты бэкенда (`https://api.competra.ru/api`) оборачивают ответ в `CommonModel<T>` (`{status, result, errors}`). Успех — `status === 1`, не HTTP-код. Всегда используй `safeApiCall`/`safeApiCallUnit` (`src/api/safeApiCall.ts`) — они уже приводят это к `ApiResult<T>` (`{kind: 'success', data}` / `{kind: 'error', message, code?}`) и репортят сетевые ошибки в `DebugErrorReporter`.

**`publicRequest` vs `authRequest`** (`src/api/client.ts`): `authRequest` добавляет Bearer-токен и сам делает refresh-and-retry на 401. Некоторые технически публичные эндпоинты всё равно ходят через `authRequest` — это сознательно повторяет старую Kotlin-логику, не баг.

**Реактивная авторизация**: `tokenStorage` (`src/auth/tokenStorage.ts`) — pub/sub поверх `localStorage`; `useIsLoggedIn()` подписан на него через `useSyncExternalStore`, поэтому статус логина в UI обновляется сразу везде, без реloadа страницы.

**Форма, инициализируемая асинхронными данными**: НЕ используй `useEffect` для копирования загруженной сущности в state формы — так делают `RatingFormPage`, `GroupMappingPage`, `WorkoutEditorPage`, `ProfileEditorPage` — используй паттерн «синхронизация во время рендера» (React-рекомендуемый способ, плюс избегает предупреждения `set-state-in-effect` от oxlint):
```tsx
const [loadedId, setLoadedId] = useState<string | null>(null)
if (entity && entity.id !== loadedId) {
  setLoadedId(entity.id)
  setForm(formFromEntity(entity))
}
```

**Карты (Leaflet)**: компоненты в `src/components/{DistanceMapView,TrackMapView,MapPickerField}.tsx`. Растягивай карту через класс `flex-1` на родителе с `display:flex`, **не** через `h-full`/`w-full` (`height: 100%`) — в этом приложении почти все страницы упираются в `min-h-screen` на верхнем уровне, а `min-height` (в отличие от `height`) не считается «явно заданной» высотой для процентного наследования у потомков (CSS 2.1 §10.5): результат — контейнер карты рендерится 0×0, хотя визуально место есть. См. комментарии в `TrackMapView.tsx`/`DistanceMapView.tsx`. Также после монтирования нужен `MapInvalidateSize` (`src/components/MapInvalidateSize.tsx`) — `bounds` в `<MapContainer>` считается один раз при монтировании и может ошибиться, если контейнер ещё не получил финальный размер от flex-раскладки.

**Графики (Chart.js/react-chartjs-2)**: `chartjs-plugin-zoom` обязательно с `limits: { x: { min: 'original', max: 'original' } }` — без этого зум колесом может уйти в бесконечный разгон (Chart.js генерирует всё больше тиков без ограничения). Видимость датасета переключай через нативный флаг `hidden` на объекте датасета, а НЕ фильтрацией массива `datasets` — react-chartjs-2 сопоставляет старые/новые датасеты по `label` между рендерами, и если участник временно пропадал из массива, это сопоставление сбивается и линия не возвращается. Чекбокс переключения видимости должен лежать в обычном `<div>`, а не в `<button disabled>` — disabled-предок в Chromium останавливает всплытие `click`/`change` от вложенных элементов, из-за чего нельзя было включить участника обратно.

**Аналитика (Яндекс.Метрика)**: `src/lib/analytics/` — веб-аналог `:core:analytics` из competra-android (AppMetrica), с теми же именами событий и параметров, чтобы Web и Android сопоставлялись в одном отчёте. `events.ts` — словарь `AnalyticsEvents` (snake_case `<domain>_<action>`, PII не передаём: email — только домен, тексты серверных ошибок — только категория), `screens.ts` — маппинг пути маршрута из `routes.tsx` на имя экрана, `analytics.ts` — трекер + `initAnalytics(router)` (вызывается в `main.tsx`, шлёт `hit` + цель `screen_view {screen}` на каждую смену маршрута через `router.subscribe`, потому что автотрекинг Метрики хэш-роутинг не видит). При добавлении **нового маршрута** — добавь его в `screens.ts`, иначе экран «слепой»; при добавлении **нового бизнес-действия** — спроси пользователя, нужно ли событие, и заведи его в `events.ts` (имя сверь с `AnalyticsEvent.kt` в Android). Счётчик включается только если задан `VITE_YM_COUNTER_ID` (в CI — переменная репозитория `YM_COUNTER_ID`) и не в debug-режиме (localhost / `?debug=1`); в dev события видны в консоли как `[analytics] ...`. Проверка реальной доставки с localhost: `VITE_YM_COUNTER_ID=<тестовый счётчик>` в `.env.local` + `?ym=1` в URL (`?ym=0` — выключить; флаг в localStorage `ymForce`), затем запросы `mc.yandex.ru/watch/<ID>` во вкладке Network. Вебвизор и clickmap выключены намеренно — на страницах формы с персональными данными.

**Дизайн-система «Лес»**: CSS-переменные в `src/index.css` (`@theme` + `:root`, с `@media (prefers-color-scheme: dark)` вариантом), замаплены на Tailwind-утилиты (`bg-surface`, `text-on-surface-variant`, `border-outline-variant` и т.д.).

**Тестовые данные без прав администратора** (клубы, рейтинги — сущности без флага `isTest`): перед созданием реальных, публично видимых тестовых данных в проде — спроси разрешения пользователя, затем сразу удали после проверки.

## Commands
- Always use rtk for commands (rtk grep, rtk find, rtk git, and etc.)

## Межпроектные связи

Этот проект — веб-клиент экосистемы из четырёх репозиториев:

| Проект | Путь | Роль |
|---|---|---|
| **eSport** (backend) | `/Users/rodionov/backend_projects/eSport` | Ktor-сервер, источник всего API |
| **competra-android** | `/Users/rodionov/android_projects/competra-android` | Android-приложение с той же доменной областью |
| **mapper** | `/Users/rodionov/android_projects/mapper` | Qt/C++ редактор карт, создаёт дистанции в формате IOF XML |

Прежний веб-клиент, `/Users/rodionov/web_projects/competra-web` (Kotlin/Wasm), теперь архивный — не деплоится, домен `competra.ru` переключён сюда.

### Правила для Claude

**При изменении функционала** (новый экран, новый API-вызов, новая бизнес-логика) — **спроси пользователя**: нужно ли то же самое сделать в `competra-android`? Обе платформы покрывают одну доменную область, и фичи часто должны быть на обеих.

**При изменении модели данных или API-вызова** — **спроси**: не сломает ли это бэкенд (eSport)? Контракт: `CommonModel<T>` с `status == 1`, `BASE_URL = https://api.competra.ru/api`.

**NFC-фичи** (чтение чипов участников) — специфичны для Android, в Web аналога нет.

**При изменении функционала, уже описанного в инструкции для организатора** (`public/guides/first-competition-guide.html`, ссылка на неё — `ORGANIZER_GUIDE_URL` в `ProfilePage.tsx`) — поправь соответствующий раздел инструкции в том же изменении, а не отдельным напоминанием пользователю.

### Цепочка IOF XML
Mapper экспортирует дистанции → пользователь загружает файл через `POST /event/orienteering/import/courses` (`src/api/distanceRepository.ts` → `importFromXml`) → eSport парсит через `IOFXmlParser.kt`. Если меняется логика загрузки, уточни, не нужно ли обновить парсер в eSport.
