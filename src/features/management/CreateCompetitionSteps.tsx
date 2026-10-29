import { useState } from 'react'
import { CoordinatesPickerField } from '../../components/CoordinatesPickerField'
import type { Club } from '../../types/club'
import { LabeledSelect } from '../../components/LabeledSelect'
import { TextInput } from '../../components/TextInput'
import { TimeZoneSelect } from '../../components/TimeZoneSelect'
import {
  formatIntervalSeconds,
  punchingSystemOptionsFor,
  REG_END_MODE_OPTIONS,
  START_INTERVAL_OPTIONS,
  START_TIME_MODE_HINT,
  startTimeModeOptionsFor,
  startTimeModePatch,
} from './dictionaries'
import { minControlsLabel, ranksByScore } from '../../lib/byChoiceMode'
import { isRequiredControl } from '../../lib/controlPoints'
import { CompetitionFormatFields } from './CompetitionFormatFields'
import { CoverPickerField } from './CoverPickerField'
import { DistanceDetailsDialog } from './DistanceDetailsDialog'
import { competitionStartMillis, isRegistrationStartAfterCompetition } from './createCompetitionValidation'
import { ControlTimeFields } from './ControlTimeFields'
import { LimitAndFeeFields } from './LimitAndFeeFields'
import { GroupsWithoutDistanceBanner, NoDistanceBadge } from './NoDistanceNotice'
import { TeamScoringFields } from './TeamScoringFields'
import type { CreateCompetitionFormState, PendingDistance, PendingGroup, XmlCoursePreview } from './types'

interface StepProps {
  form: CreateCompetitionFormState
  onPatch: (patch: Partial<CreateCompetitionFormState>) => void
}

export function BasicStep({ form, onPatch, isPastEvent }: StepProps & { isPastEvent: boolean }) {
  const start = competitionStartMillis(form)
  // Момент открытия шага: Date.now() в рендере линтер считает нечистым.
  const [now] = useState(() => Date.now())
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Основная информация</h2>
      <TextInput label="Название" required value={form.title} onChange={(title) => onPatch({ title })} />
      <CoverPickerField imageUrl={form.imageUrl} onChange={(imageUrl) => onPatch({ imageUrl })} />
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Дата старта *</span>
          <input
            type="date"
            value={form.startDateStr}
            onChange={(e) => onPatch({ startDateStr: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Время старта</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => onPatch({ startTime: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
      </div>
      {!isPastEvent && start != null && start < now && (
        <p className="-mt-1 text-sm text-error">
          Время старта уже прошло — регистрация будет сразу закрыта. Для прошедшего соревнования используйте «Добавить
          прошедшее».
        </p>
      )}
      <TimeZoneSelect zoneId={form.zoneId} onSelect={(zoneId) => onPatch({ zoneId })} />
      <TextInput label="Место проведения" required value={form.address} onChange={(address) => onPatch({ address })} />
      <CoordinatesPickerField
        latitude={form.latitude}
        longitude={form.longitude}
        onPick={(latitude, longitude) => onPatch({ latitude, longitude })}
      />
      <TextInput label="Описание" multiline value={form.description} onChange={(description) => onPatch({ description })} />

      <h2 className="mt-2 text-base font-medium text-fg">Параметры ориентирования</h2>
      <CompetitionFormatFields
        direction={form.direction}
        byChoiceMode={form.byChoiceMode}
        overtimePolicy={form.overtimePolicy}
        onChange={onPatch}
      />
      <LabeledSelect
        label="Система отметки"
        value={form.punchingSystem}
        options={punchingSystemOptionsFor(form.startTimeMode, form.punchingSystem)}
        onChange={(punchingSystem) => onPatch({ punchingSystem })}
      />
      <LabeledSelect
        label="Способ старта"
        value={form.startTimeMode}
        options={startTimeModeOptionsFor(form.startTimeMode)}
        onChange={(startTimeMode) => onPatch(startTimeModePatch(startTimeMode, form.punchingSystem))}
      />
      <span className="-mt-2 text-xs text-on-surface-variant">{START_TIME_MODE_HINT}</span>
      {/* При старте по стартовой станции реальное время старта берётся из чипа — интервал не нужен. */}
      {form.startTimeMode !== 'BY_START_STATION' && (
        <LabeledSelect
          label="Интервал старта"
          value={form.startInterval}
          options={START_INTERVAL_OPTIONS.map((s) => [s, formatIntervalSeconds(s)] as [number, string])}
          onChange={(startInterval) => onPatch({ startInterval })}
        />
      )}
      <ControlTimeFields
        direction={form.direction}
        byChoiceMode={form.byChoiceMode}
        controlTimeMinutes={form.controlTimeMinutes}
        overtimePolicy={form.overtimePolicy}
        onChange={onPatch}
      />
      <TeamScoringFields
        value={form.teamScoring}
        isScoreO={ranksByScore(form.direction, form.byChoiceMode)}
        onChange={(teamScoring) => onPatch({ teamScoring })}
      />
    </div>
  )
}

export function RegistrationStep({ form, onPatch }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Регистрация</h2>
      <label className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-base text-fg">Открыть регистрацию сразу</span>
          <span className="text-sm text-on-surface-variant">Иначе укажите дату и время начала регистрации</span>
        </span>
        <input
          type="checkbox"
          checked={form.registrationOpenImmediately}
          onChange={(e) => onPatch({ registrationOpenImmediately: e.target.checked })}
        />
      </label>
      {!form.registrationOpenImmediately && (
        <>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Начало регистрации</span>
            <input
              type="date"
              value={form.regStartDateStr}
              onChange={(e) => onPatch({ regStartDateStr: e.target.value })}
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Время</span>
            <input
              type="time"
              value={form.regStartTime}
              onChange={(e) => onPatch({ regStartTime: e.target.value })}
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
          </label>
        </div>
        {isRegistrationStartAfterCompetition(form) && (
          <p className="-mt-1 text-sm text-error">Регистрация должна открыться не позже старта соревнования</p>
        )}
        </>
      )}
      <LabeledSelect
        label="Окончание регистрации"
        value={form.registrationEndMode}
        options={REG_END_MODE_OPTIONS}
        onChange={(registrationEndMode) => onPatch({ registrationEndMode })}
      />
      <LimitAndFeeFields
        maxParticipants={form.maxParticipants}
        feeAmount={form.feeAmount}
        feeCurrency={form.feeCurrency}
        onChange={onPatch}
      />
    </div>
  )
}

export function OrganizerStep({ form, onPatch, myClubs }: StepProps & { myClubs: Club[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Контакты организатора</h2>
      <TextInput label="Организатор (ФИО)" value={form.organizerName} onChange={(organizerName) => onPatch({ organizerName })} />
      <p className="text-sm text-on-surface-variant">
        По умолчанию — ваше имя из профиля. Можно указать другого человека: он не обязательно должен быть зарегистрирован в системе — просто отображается на странице соревнования.
      </p>
      <TextInput label="Телефон" required type="tel" value={form.contactPhone} onChange={(contactPhone) => onPatch({ contactPhone })} />
      <TextInput label="Email" type="email" value={form.contactEmail} onChange={(contactEmail) => onPatch({ contactEmail })} />
      {myClubs.length > 0 && (
        <>
          <LabeledSelect
            label="Клуб-организатор"
            value={form.organizingClubId ?? ''}
            options={[['', 'Без клуба'], ...myClubs.map((c): [string, string] => [c.id, c.name])]}
            onChange={(id) => onPatch({ organizingClubId: id || null })}
          />
          <span className="-mt-2 text-xs text-on-surface-variant">Клубы, где вы основатель или администратор</span>
        </>
      )}
      <h2 className="mt-2 text-base font-medium text-fg">Ссылки</h2>
      <TextInput label="Сайт соревнования" value={form.website} onChange={(website) => onPatch({ website })} />
      <TextInput label="Ссылка на положение" value={form.regulationUrl} onChange={(regulationUrl) => onPatch({ regulationUrl })} />
      <TextInput label="Ссылка на карту" value={form.mapUrl} onChange={(mapUrl) => onPatch({ mapUrl })} />
    </div>
  )
}

/** «Взять 2 из 3 КП • обязательные: 31» — правила дистанции «по выбору», если они заданы. */
function pendingRulesLabel(distance: PendingDistance): string | null {
  const required = distance.controlPoints.filter(isRequiredControl).map((cp) => cp.number)
  const parts = [
    distance.minControlsCount != null ? minControlsLabel(distance.minControlsCount, distance.controlPoints.length) : null,
    required.length > 0 ? `обязательные: ${required.join(', ')}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' • ') : null
}

interface DistancesStepProps {
  distances: PendingDistance[]
  importXmlName: string | null
  importedPreviews: XmlCoursePreview[]
  isPastEvent: boolean
  direction: string
  byChoiceMode: string
  onAdd: () => void
  onEdit: (index: number) => void
  onRemove: (index: number) => void
  onPickXml: (file: File) => void
  onClearXml: () => void
}

export function DistancesStep({
  distances,
  importXmlName,
  importedPreviews,
  isPastEvent,
  direction,
  byChoiceMode,
  onAdd,
  onEdit,
  onRemove,
  onPickXml,
  onClearXml,
}: DistancesStepProps) {
  const [detailsIndex, setDetailsIndex] = useState<number | null>(null)
  const detailsDistance = detailsIndex != null ? distances[detailsIndex] : undefined
  // В «по выбору» порядка нет — номера через запятую, а не стрелками.
  const controlsSeparator = direction === 'BY_CHOICE' ? ', ' : ' → '

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Дистанции</h2>
      <p className="text-sm text-on-surface-variant">
        {isPastEvent
          ? 'Можно пропустить, если детали дистанций неизвестны.'
          : 'Добавьте дистанции — их можно будет выбрать для групп на следующем шаге. Если дистанции ещё не спланированы, шаг можно пропустить: регистрация в группы откроется и без них, а назначить дистанции можно позже.'}
      </p>

      <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
        <span className="text-base font-semibold text-fg">Импорт из Mapper (IOF XML)</span>
        <p className="text-sm text-on-surface-variant">
          Выберите готовый XML-файл с дистанциями — он будет импортирован при создании соревнования.
        </p>
        {importXmlName == null ? (
          <label className="cursor-pointer rounded-md border border-outline px-4 py-2 text-center text-sm text-fg">
            Загрузить IOF XML файл
            <input
              type="file"
              accept=".xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPickXml(file)
              }}
            />
          </label>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="flex-1 text-sm text-fg">Файл: {importXmlName}</span>
            <button type="button" onClick={onClearXml} className="text-sm text-error">
              Убрать
            </button>
          </div>
        )}
        {importXmlName != null &&
          (importedPreviews.length === 0 ? (
            <p className="text-sm text-error">В файле не найдено ни одной дистанции (Course).</p>
          ) : (
            importedPreviews.map((p, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-sm text-fg">
                  {p.name} — {p.lengthMeters} м, КП: {p.controlNumbers.length}
                </span>
                {p.controlNumbers.length > 0 && (
                  <span className="text-sm text-on-surface-variant">{p.controlNumbers.join(controlsSeparator)}</span>
                )}
              </div>
            ))
          ))}
      </div>

      {distances.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Пока нет дистанций, добавленных вручную</p>
      ) : (
        distances.map((d, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3"
          >
            <button
              type="button"
              onClick={() => setDetailsIndex(index)}
              aria-label={`Подробнее о дистанции ${d.name ?? ''}`.trim()}
              className="-m-1 flex flex-1 flex-col rounded-md p-1 text-left hover:bg-surface-variant"
            >
              <span className="font-semibold text-fg">{d.name ?? 'Без названия'}</span>
              <span className="text-sm text-on-surface-variant">
                Длина: {d.lengthMeters} м • Набор: {d.climbMeters} м • КП: {d.controlPoints.length}
              </span>
              {pendingRulesLabel(d) && <span className="text-sm text-on-surface-variant">{pendingRulesLabel(d)}</span>}
            </button>
            <div className="flex shrink-0 gap-3">
              <button type="button" onClick={() => onEdit(index)} className="text-sm text-primary">
                Изменить
              </button>
              <button type="button" onClick={() => onRemove(index)} className="text-sm text-error">
                Удалить
              </button>
            </div>
          </div>
        ))
      )}
      <button type="button" onClick={onAdd} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        + Добавить дистанцию
      </button>

      {detailsDistance && (
        <DistanceDetailsDialog
          distance={detailsDistance}
          direction={direction}
          byChoiceMode={byChoiceMode}
          onDismiss={() => setDetailsIndex(null)}
        />
      )}
    </div>
  )
}

interface GroupsStepProps {
  groups: PendingGroup[]
  distanceOptions: [string, string][]
  isPastEvent: boolean
  onAdd: () => void
  onAddStandard: () => void
  onEdit: (index: number) => void
  onRemove: (index: number) => void
}

export function GroupsStep({ groups, distanceOptions, isPastEvent, onAdd, onAddStandard, onEdit, onRemove }: GroupsStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Группы участников</h2>
      {isPastEvent && (
        <p className="text-sm text-on-surface-variant">
          Можно пропустить — группы, участники и результаты можно будет создать одним действием при импорте результатов
          из Excel на вкладке «Результаты».
        </p>
      )}
      {groups.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Пока нет групп</p>
      ) : (
        groups.map((g, index) => {
          const distName = distanceOptions.find(([key]) => key === g.distanceKey)?.[1] ?? null
          const ageStr =
            g.minAge != null && g.maxAge != null
              ? `${g.minAge}–${g.maxAge} лет  •  `
              : g.maxAge != null
                ? `до ${g.maxAge} лет  •  `
                : g.minAge != null
                  ? `${g.minAge} лет и старше  •  `
                  : ''
          return (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-fg">{g.title}</span>
                <span className="text-sm text-on-surface-variant">
                  {ageStr}
                  {distName != null && `Дистанция: ${distName}`}
                </span>
                {distName == null && !isPastEvent && <NoDistanceBadge />}
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" onClick={() => onEdit(index)} className="text-sm text-primary">
                  Изменить
                </button>
                <button type="button" onClick={() => onRemove(index)} className="text-sm text-error">
                  Удалить
                </button>
              </div>
            </div>
          )
        })
      )}
      {!isPastEvent && (
        <GroupsWithoutDistanceBanner
          titles={groups.filter((g) => !distanceOptions.some(([key]) => key === g.distanceKey)).map((g) => g.title)}
        />
      )}
      <button type="button" onClick={onAddStandard} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        + Стандартные группы
      </button>
      <button type="button" onClick={onAdd} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        + Добавить группу
      </button>
    </div>
  )
}
