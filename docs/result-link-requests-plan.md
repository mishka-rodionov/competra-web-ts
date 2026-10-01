# Привязка ручных результатов к аккаунту — план реализации

> **Статус (2026-09-30):** фазы 0–2 реализованы — eSport в ветке `feature/result-link-requests`
> (worktree `/Users/rodionov/backend_projects-links`), веб — в рабочей копии competra-web-ts; всё проверено
> вручную на локальной БД. Фаза 3 (Android) не начата. OpenAPI (`documentation.yaml`) в eSport практически
> пустой — не обновлялся.

Пользователь находит свои результаты, внесённые организатором вручную (`participant.userId` пустой), и подаёт
заявку на привязку. Организатор её одобряет — бэкенд записывает `participant.userId = <id пользователя>`.
Результаты, сплиты и треки не копируются: всё висит на участнике, меняется только ссылка.

Затрагивает три репозитория: **eSport** (бэкенд) → **competra-web-ts** → **competra-android**.

## Термины

- **Заявка на привязку** (`ParticipantLinkRequest`) — «участник X — это я», статусы
  `PENDING | APPROVED | REJECTED | CANCELLED | UNLINKED` (`UNLINKED` — была одобрена, потом участника отвязали).
- **Подсказка** — непривязанный участник, у которого фамилия и имя совпадают с профилем пользователя.
- **Непривязанный участник** — `user_id IS NULL OR user_id = ''`. Android пишет `""` для вручную
  добавленных (`ParticipantListViewModel`, локальная колонка `userId TEXT NOT NULL`), поэтому
  **везде проверяем «пусто или null»**, как уже делает `RatingService.participantKey` (`isNullOrBlank`).
  Нормализовать `""` → `NULL` в БД бессмысленно: Android будет снова присылать `""`.

## Что уже зависит от `participant.userId` (менять не нужно, но проверить после реализации)

| Где | Что даёт привязка |
|---|---|
| `RatingService.participantKey` | ключ `user:<id>` вместо `guest:фамилия:имя` — старты одного человека склеиваются в рейтинге (сейчас человек, у которого часть стартов привязана, а часть нет, **раздвоен**) |
| `OrienteeringCompetitionService.getRegisteredByUserId` | соревнование появляется в «моих стартах» |
| `notifyResultsPublished` | push о публикации результатов |
| `CompetitionDetailPage.registeredGroupId` (веб), `EventParticipantGroupViewModel` (Android) | признак «я зарегистрирован» |

Побочный эффект: ссылки вида `/ratings/:id/athlete/:groupId/guest:...` после привязки перестанут работать
(ключ станет `user:...`). Это допустимо.

---

## Фаза 0 — eSport: защитить `userId` от перезаписи (отдельный деплой, делать первым)

**Проблема.** `OrienteeringParticipantService.upsert` и `upsertAll` при обновлении безусловно делают
`it[userId] = req.userId`. Если организатор отредактирует участника с устаревшей копией, одобренная привязка
сотрётся: у Android `""` из локальной БД, если он не успел подтянуть изменения. Второе следствие: сейчас
организатор может через `save/participant` прописать участнику **любой** `userId` без согласия пользователя.

**Изменение.** В ветке `update` обеих функций брать `userId` только из существующей записи:

```kotlin
// userId меняется только через заявки на привязку/отвязку (ParticipantLinkRequestService) — не через редактирование участника
it[userId] = existing[OrienteeringParticipants.userId]
```

В ветке `insert` ничего не меняем: веб шлёт `null`, Android шлёт `""`, самостоятельная регистрация идёт через `/register`.

Подстраховка для Android: привязка и отвязка обновляют `updatedAt`. Android шлёт `serverUpdatedAt`, поэтому
устаревшая правка получит 409 и уйдёт в существующий `conflictResolver.applyParticipantConflict`.
Веб `serverUpdatedAt` не шлёт, но в `ParticipantEditorDialog` передаёт `editingParticipant.userId`, так что
данные в любом случае свежие.

---

## Фаза 1 — eSport: заявки на привязку

Шаблон — `ClubJoinRequestService` / `ClubJoinRequests` / `clubsRoutes`: та же форма сервиса, ответов и роутинга.

### 1.1 Таблица `data/database/entity/ParticipantLinkRequests.kt`

```kotlin
object ParticipantLinkRequests : Table("participant_link_requests") {
    val id = varchar("id", 36)
    val participantId = varchar("participant_id", 200)
        .references(OrienteeringParticipants.id, onDelete = ReferenceOption.CASCADE)
    // Денормализовано — список заявок организатора и счётчики по соревнованиям без join через участников
    val competitionId = varchar("competition_id", 36)
        .references(Competitions.id, onDelete = ReferenceOption.CASCADE)
    val userId = varchar("user_id", 200)
    /** PENDING | APPROVED | REJECTED | CANCELLED */
    val status = varchar("status", 20).default("PENDING")
    /** SUGGESTION — из подсказок в профиле, MANUAL — кнопка «Это мой результат».
     *  Свойство не `source`: имя занято членом Exposed ColumnSet. */
    val requestSource = varchar("source", 20)
    /** Причина отклонения — видна заявителю */
    val comment = varchar("comment", 500).nullable()
    val reviewedBy = varchar("reviewed_by", 200).nullable()
    val reviewedAt = long("reviewed_at").nullable()
    val createdAt = long("created_at")
    val updatedAt = long("updated_at").default(0L)

    override val primaryKey = PrimaryKey(id)

    init {
        index(false, participantId, status)
        index(false, userId, status)
        index(false, competitionId, status)
    }
}
```

Добавить в `SchemaUtils.create(...)` в `Databases.kt`. `ALTER`-миграции не нужны, таблица новая.

### 1.2 Сопоставление по имени — чистые функции (`data/services/NameMatching.kt`) + unit-тест

```kotlin
/** trim, lowercase, ё→е, схлопнуть пробелы, дефис оставить (двойные фамилии) */
internal fun normalizePersonName(raw: String): String
/** Совпадение ФИ, в т.ч. перепутанные местами (организаторы иногда вводят «Имя Фамилия») */
internal fun namesMatch(userFirst: String, userLast: String, pFirst: String, pLast: String): Boolean
```

В SQL делаем грубый фильтр `lower(last_name) IN (lower(L), lower(F))` по индексу или без него, точное
сравнение с учётом `ё→е` и перестановки — в Kotlin. Объём данных небольшой.

### 1.3 Сервис `ParticipantLinkRequestService`

Все методы в `dbQuery { }` (как в `ClubJoinRequestService`). Права организатора — через
`requireParticipantEditAccess(competitionId, userId)` (`CompetitionAuthorization.kt`). Её проходят owner,
FOUNDER/ADMIN клуба-организатора, а также организаторы MAIN, JUDGE и SECRETARY.
Бизнес-ошибки → `UnprocessableEntityException` (422, текст для пользователя), нет прав → `ForbiddenException`.

**`suggestions(userId): List<LinkSuggestionResponse>`**
- Берём `firstName/lastName` из `UserService.Users`. Если оба пустые — пустой список.
- Непривязанные участники с `namesMatch(...)`, исключая:
  - соревнования, где у пользователя уже есть участник (привязать нельзя, см. правило дубля);
  - участников, по которым у этого пользователя есть заявка в статусе `PENDING` или `REJECTED`
    (отклонённые больше не предлагаем, вручную подать можно).
- К каждой строке добавляем название и дату соревнования, группу, команду и результат
  (`rank`, `totalTime`, `status` из `OrienteeringResults` по `participantId`), чтобы человек узнал свой старт.
- Сортировка по дате соревнования (сначала новые), лимит 100.

**`create(userId, participantIds, source): List<LinkRequestResponse>`** — для каждого участника:
1. Участник существует, иначе 404.
2. Уже привязан к этому же пользователю → пропускаем. Привязан к другому → 422
   «Результат уже привязан к другому пользователю».
3. У пользователя уже есть участник в этом соревновании → 422
   «Вы уже есть в протоколе этого соревнования. Если это дубль, попросите организатора удалить лишнюю запись».
4. Есть `PENDING` от этого пользователя на этого участника → возвращаем её же (идемпотентно, как в клубах).
5. Анти-спам: не больше 50 `PENDING` на пользователя → 422.
6. **Автоодобрение:** если у заявителя есть `MANAGE_PARTICIPANTS` на это соревнование (организатор привязывает
   свои же результаты), сразу выполняем логику `approve`.

После транзакции — по одному push на соревнование всем, кто может одобрить (см. 1.5).

**`listMine(userId)`** — заявки пользователя: название и дата соревнования, ФИ и группа участника, статус,
`comment`, `createdAt`.

**`cancel(requestId, userId)`** — только свою и только `PENDING` → `CANCELLED`.

**`listForCompetition(competitionId, requesterId)`** — `requireParticipantEditAccess`. Для каждой заявки:
- участник: ФИ, группа, команда, стартовый номер, место и время;
- заявитель: ФИ, **год рождения** (`parseBirthYear` из `GroupEligibility.kt`), пол. Email и телефон **не отдаём**;
- `eligibilityWarning: String?` — `linkEligibilityWarning(...)` (обёртка над `checkGroupEligibility` с текстами
  для организатора: «в профиле заявителя не указан пол», «год рождения заявителя — …»). Подсказка, не блокировка;
- `nameMatches: Boolean` — `namesMatch(...)`. Для `MANUAL`-заявок может быть `false`, это повод присмотреться;
- `competingRequests: Int` — сколько ещё `PENDING` на этого же участника от других людей;
- `userAlreadyInCompetition: Boolean` — одобрить не получится, надо удалить дубль.

**`pendingCounts(requesterId): Map<competitionId, Int>`** — количество `PENDING` по соревнованиям, где у
пользователя есть `MANAGE_PARTICIPANTS`. Нужно для бейджей в списке «Управление». Реализация: соревнования,
которыми он владеет, + соревнования его клубов с ролью FOUNDER/ADMIN + `CompetitionOrganizers` с подходящей ролью,
затем `GROUP BY competition_id`.

**`review(requestId, requesterId, approve, comment)`** — одна транзакция:
1. Заявка существует и в статусе `PENDING`, иначе 422 «Заявка уже обработана».
2. `requireParticipantEditAccess(request.competitionId, requesterId)`.
3. При `approve`:
   - строка участника читается `forUpdate()`, чтобы два одновременных одобрения не прошли оба;
   - участник всё ещё не привязан, иначе 422;
   - у заявителя нет другого участника в этом соревновании, иначе 422 с текстом про дубль;
   - `participants.user_id = request.userId`, `updated_at = now`;
   - заявка → `APPROVED`, `reviewedBy/At`;
   - остальные `PENDING` на этого участника → `REJECTED`, `comment = "Результат привязан к другому участнику"`.
4. При отклонении: `REJECTED` + `comment`.
5. После транзакции — push заявителю, а при одобрении ещё и авто-отклонённым.

**`unlink(participantId, requesterId)`**
- Разрешено, если `participant.userId == requesterId` (отвязываю себя) или у запрашивающего есть
  `MANAGE_PARTICIPANTS`.
- `user_id = NULL`, `updated_at = now`; `APPROVED`-заявки этого пользователя на участника → `UNLINKED`.
  После отвязки участник снова появляется в подсказках, можно подать новую заявку.

### 1.4 Роуты `data/routing/ParticipantLinkRouting.kt`

Все под `authenticate("auth-jwt")`, регистрация рядом с `clubsRoutes(...)` в `Routing.kt` (~стр. 130).

| Метод | Путь | Тело / параметры | Ответ |
|---|---|---|---|
| GET | `/event/orienteering/link-requests/suggestions` | — | `LinkSuggestionResponse[]` |
| POST | `/event/orienteering/link-requests` | `{ participantIds: string[], source: "SUGGESTION" \| "MANUAL" }` | `LinkRequestResponse[]` |
| GET | `/event/orienteering/link-requests/mine` | — | `LinkRequestResponse[]` |
| DELETE | `/event/orienteering/link-requests/{id}` | — | `status=1` |
| GET | `/event/orienteering/link-requests/competition` | `?competitionId=` | `CompetitionLinkRequestResponse[]` |
| GET | `/event/orienteering/link-requests/pending-counts` | — | `{ [competitionId]: number }` |
| PUT | `/event/orienteering/link-requests/{id}` | `{ approve: boolean, comment?: string }` | `LinkRequestResponse` |
| POST | `/event/orienteering/participants/{id}/unlink` | — | `status=1` |

Формат ответов — `CommonModel<T>` со `status = 1`, поля в camelCase, как у `event/orienteering/*`.
Обновить `resources/openapi/documentation.yaml`.

### 1.5 Push-уведомления (`FcmService.sendToUser`)

| `kind` | Кому | Текст | `data` |
|---|---|---|---|
| `participant_link_requested` | всем, кто может одобрить (owner, FOUNDER/ADMIN клуба, организаторы с `MANAGE_PARTICIPANTS`) | «Иванов Иван просит привязать результат — «Название»» | `competition_id` |
| `participant_link_reviewed` | заявителю | «Результат привязан к вашему профилю» / «Заявка отклонена: <comment>» | `competition_id`, `approved` |

Отправлять вне транзакции, как `notifyResultsPublished`. Клиент Android должен знать эти `kind`.

### 1.6 Тесты eSport

- `NameMatchingTest`: `ё/е`, регистр, пробелы, двойные фамилии, перестановка.
- Для остального (сервис с БД) тестов в проекте нет. Проверяем вручную через API на тестовом соревновании
  (см. «Проверка»).

---

## Фаза 2 — веб (competra-web-ts)

### 2.1 Типы и API

- `src/types/participantLink.ts` — `LinkSuggestion`, `LinkRequest`, `CompetitionLinkRequest`,
  `LinkRequestStatus`, `LinkRequestSource`, зеркально ответам 1.4.
- `src/api/participantLinkRepository.ts` — 8 методов через `authRequest` + `safeApiCall`/`safeApiCallUnit`,
  по образцу `clubRepository` (join-requests).
- `src/features/participant-links/hooks.ts` — `useLinkSuggestions`, `useMyLinkRequests`,
  `useCompetitionLinkRequests(competitionId)`, `usePendingLinkCounts`. Query keys:
  `['link-suggestions']`, `['my-link-requests']`, `['competition-link-requests', id]`, `['link-pending-counts']`.
  После мутаций инвалидировать и их, и `['participants', competitionId]` / `['registered-competitions']`.
- `src/features/participant-links/labels.ts` — подписи и цвета статусов (как `features/clubs/labels.ts`).

### 2.2 Пользователь: профиль

**`ProfilePage.tsx`**
- Карточка над «Предстоящими стартами»: **«Найдены результаты, похожие на ваши: N»** →
  `/profile/result-links`. Показывается, если `suggestions.length > 0` или есть `PENDING`-заявки
  (тогда текст «Заявок на рассмотрении: K»).
- Новая секция **«Прошедшие старты»**: сейчас профиль показывает только будущие
  (`useUpcomingCompetitions` фильтрует `startDate >= now`). Без этой секции пользователь в вебе не увидит
  результата привязки. Реализация: тот же запрос `getRegisteredCompetitions`, второй хук `usePastCompetitions`
  с обратным фильтром, сортировка по убыванию даты, клик ведёт на `/competition/:id`.

**Новая страница `src/pages/ResultLinksPage.tsx`, маршрут `/profile/result-links`** (вне `AppShell`, как `/profile/edit`)
- Вверху поясняющий текст: «Организатор соревнования проверит заявку. Отмечайте только свои результаты».
- **«Похожие на ваши»** — список подсказок с чекбоксами. Строка: название и дата соревнования,
  «Иванов Иван · М21 · 5 место · 45:12». Кнопки «Выбрать все» и «Отправить заявку (k)».
  Перед отправкой — диалог подтверждения. Отправка: `create(ids, 'SUGGESTION')`.
- **«Мои заявки»** — статусы (на рассмотрении / привязан / отклонён + комментарий / отозван), у `PENDING` кнопка «Отозвать».
- **Привязанные результаты** — отдельно не показываем, они попадают в «Прошедшие старты» профиля.
- Пустое состояние: «Похожих результатов не найдено. Если организатор записал вас с другим именем,
  откройте свой результат в протоколе и нажмите «Это мой результат»».

### 2.3 Пользователь: протокол соревнования

**`ResultsTab.tsx`** — баннер над таблицами (только для залогиненного пользователя), если среди подсказок есть
участники этого соревнования: «Похоже, здесь есть ваш результат: Иванов Иван, М21» с кнопкой «Привязать»,
которая ведёт на тот же диалог подтверждения. В строки таблицы кнопки не добавляем: не засоряем протокол, а клик
по строке уже ведёт на сплиты.

**`ParticipantSplitsPage.tsx`** (`/competition/:id/participant/:participantId/splits`) — ручной вход для
случаев, когда имя не совпало. Кнопка **«Это мой результат»**, если одновременно:
- пользователь залогинен;
- участник не привязан (`!participant.userId`);
- у пользователя нет своего участника в этом соревновании (`participants.some(p => p.userId === profile.id)`);
- нет своей `PENDING`-заявки на этого участника. Если есть — показываем плашку «Заявка на рассмотрении».

Если участник привязан к текущему пользователю — «Это ваш результат» и ссылка «Отвязать» с подтверждением.
Отправка: `create([id], 'MANUAL')`.

### 2.4 Организатор

**`ManagementPage.tsx`** — бейдж «Заявки: N» на карточке соревнования из `usePendingLinkCounts`.

**`ManageCompetitionPage.tsx`** — вкладка `{ key: 'links', label: 'Заявки' }`. В подписи счётчик
`PENDING`, если он больше нуля: «Заявки (2)».

**Новый `src/features/management/LinkRequestsTab.tsx`**
- `PENDING`-заявки сгруппированы по заявителю. Шапка группы: «Иванов Иван · 1990 г.р. · М».
  Внутри — заявленные участники: «Иванов Иван · М21 · №12 · 5 место · 45:12».
- Предупреждения (жёлтые плашки): `eligibilityWarning`; «Имя в протоколе отличается от профиля»
  (`!nameMatches`); «На этот результат есть ещё K заявок»; «Заявитель уже есть в протоколе — удалите дубль»
  (`userAlreadyInCompetition`, кнопка «Одобрить» тогда неактивна).
- Кнопки «Одобрить» и «Отклонить». При отклонении — необязательный комментарий, заявитель его увидит.
  Для группы из нескольких заявок — «Одобрить все» (последовательные `PUT`; ошибки показываются по строкам).
- Свёрнутый блок «Обработанные» — история `APPROVED`/`REJECTED`/`CANCELLED`.

**`ParticipantsManageTab.tsx`** — у привязанных участников значок «аккаунт» с подсказкой «Привязан к профилю
пользователя». **`ParticipantEditorDialog.tsx`** — для привязанного участника кнопка «Отвязать от профиля»
с подтверждением (вызывает `unlink`).

### 2.5 Аналитика (`src/lib/analytics/`)

- `screens.ts`: `'/profile/result-links': 'profile_result_links'`.
- `events.ts`, те же имена завести в Android `AnalyticsEvent.kt`:

| Событие | Параметры | Когда |
|---|---|---|
| `result_link_suggestions_viewed` | `count` | открыт экран подсказок |
| `result_link_requested` | `competition_id`, `source: suggestion \| manual`, `count` | отправлена заявка (одно событие на соревнование) |
| `result_link_request_cancelled` | `competition_id` | отозвана |
| `result_link_request_reviewed` | `competition_id`, `approved` | организатор решил |
| `result_unlinked` | `competition_id`, `by: self \| organizer` | отвязка |

### 2.6 Инструкция организатора

`public/guides/first-competition-guide.html` — новый раздел «Спортсмены привязывают результаты к своему
профилю»: откуда берутся заявки, что проверять (год рождения и группа, предупреждения), как быть с дублем,
как отвязать. Добавить его в оглавление гайда.

---

## Фаза 3 — Android (competra-android)

Шаблон — клубные заявки: `ClubJoinRequestRepository`, `feature/clubs/.../join_requests`, `my_requests`.

- **data/remote + domain:** запросы и ответы 1.4, `ParticipantLinkRequestRepository`, модели.
- **Профиль (`feature/profile`):** такая же карточка и экран «Похожие на ваши / Мои заявки», как в вебе (2.2);
  проверить, что `UserRegistrations` показывает прошедшие старты.
- **Детали соревнования (`core/eventdetails`):** баннер в результатах и «Это мой результат» на экране
  участника (2.3).
- **Центр (`feature/center`, event control):** раздел «Заявки» со счётчиком (2.4), отвязка в карточке участника.
- **FCM:** обработка `participant_link_requested` (переход к заявкам соревнования) и
  `participant_link_reviewed` (переход к «Моим заявкам»).
- **Синхронизация:** убедиться, что при pull с сервера локальный `userId` участника обновляется. После
  фазы 0 сервер всё равно не даст его перезаписать, но UI организатора должен показывать актуальную привязку.
- **Аналитика:** события из 2.5 с теми же именами, экран `profile_result_links`.

---

## Порядок и деплой

1. **Фаза 0** (eSport) — отдельный небольшой коммит и деплой. Безопасно для текущих клиентов.
2. **Фаза 1** (eSport) — новые таблица и эндпоинты, существующие контракты не меняются.
3. **Фаза 2** (веб) — после деплоя фазы 1. Сразу даёт рабочий процесс: пользователь подаёт заявку из
   веба, организатор одобряет из веба.
4. **Фаза 3** (Android).

## Проверка (вручную, на проде)

Нужны два аккаунта: организатор и тестовый спортсмен.

1. Организатор создаёт тестовое соревнование (`isTest`) и вручную вносит участника с ФИ тестового спортсмена
   и ещё одного — с «чужим» именем. Затем вносит результаты (импорт прошлых результатов).
2. Спортсмен: в профиле видна карточка с подсказкой. Отправляет заявку на первого участника. На
   `ParticipantSplitsPage` второго участника подаёт `MANUAL`-заявку.
3. Организатор: бейдж на соревновании в «Управлении», вкладка «Заявки», предупреждение `nameMatches=false` у
   второй заявки. Первую одобряет, вторую отклоняет с комментарием.
4. Спортсмен: заявка в статусе «привязан», соревнование в «Прошедших стартах», протокол показывает
   «Это ваш результат», отклонённая заявка видна с комментарием.
5. Рейтинг: если соревнование добавлено в рейтинг — у спортсмена одна строка с ключом `user:`.
6. Организатор правит привязанного участника в редакторе — `userId` не теряется (фаза 0).
7. Отвязка со стороны спортсмена и со стороны организатора.
8. Удалить тестовые данные.

Гранично: два аккаунта заявили одного участника → при одобрении одного второй получает автоотклонение;
спортсмен сам зарегистрировался на соревнование, где его ещё и внесли вручную → «Одобрить» неактивна,
подсказка про дубль.
