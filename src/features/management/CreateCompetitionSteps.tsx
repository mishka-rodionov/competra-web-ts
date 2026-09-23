import { CoordinatesPickerField } from '../../components/CoordinatesPickerField'
import { LabeledSelect } from '../../components/LabeledSelect'
import { TextInput } from '../../components/TextInput'
import { TimeZoneSelect } from '../../components/TimeZoneSelect'
import {
  DIRECTION_OPTIONS,
  formatIntervalSeconds,
  punchingSystemOptionsFor,
  REG_END_MODE_OPTIONS,
  START_INTERVAL_OPTIONS,
  START_TIME_MODE_OPTIONS,
  startTimeModePatch,
} from './dictionaries'
import { ControlTimeFields } from './ControlTimeFields'
import { LimitAndFeeFields } from './LimitAndFeeFields'
import type { CreateCompetitionFormState, PendingDistance, PendingGroup, XmlCoursePreview } from './types'

interface StepProps {
  form: CreateCompetitionFormState
  onPatch: (patch: Partial<CreateCompetitionFormState>) => void
}

export function BasicStep({ form, onPatch }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Основная информация</h2>
      <TextInput label="Название" required value={form.title} onChange={(title) => onPatch({ title })} />
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
      <TimeZoneSelect zoneId={form.zoneId} onSelect={(zoneId) => onPatch({ zoneId })} />
      <TextInput label="Место проведения" value={form.address} onChange={(address) => onPatch({ address })} />
      <CoordinatesPickerField
        latitude={form.latitude}
        longitude={form.longitude}
        onPick={(latitude, longitude) => onPatch({ latitude, longitude })}
      />
      <TextInput label="Описание" multiline value={form.description} onChange={(description) => onPatch({ description })} />

      <h2 className="mt-2 text-base font-medium text-fg">Параметры ориентирования</h2>
      <LabeledSelect
        label="Направление"
        value={form.direction}
        options={DIRECTION_OPTIONS}
        onChange={(direction) => onPatch({ direction })}
      />
      <LabeledSelect
        label="Система отметки"
        value={form.punchingSystem}
        options={punchingSystemOptionsFor(form.startTimeMode)}
        onChange={(punchingSystem) => onPatch({ punchingSystem })}
      />
      <LabeledSelect
        label="Режим старта"
        value={form.startTimeMode}
        options={START_TIME_MODE_OPTIONS}
        onChange={(startTimeMode) => onPatch(startTimeModePatch(startTimeMode, form.punchingSystem))}
      />
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
        controlTimeMinutes={form.controlTimeMinutes}
        overtimePolicy={form.overtimePolicy}
        onChange={onPatch}
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
      )}
      <LabeledSelect
        label="Окончание регистрации"
        value={form.registrationEndMode}
        options={REG_END_MODE_OPTIONS}
        onChange={(registrationEndMode) => onPatch({ registrationEndMode })}
      />
      <LimitAndFeeFields maxParticipants={form.maxParticipants} feeAmount={form.feeAmount} onChange={onPatch} />
    </div>
  )
}

export function OrganizerStep({ form, onPatch }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Контакты организатора</h2>
      <TextInput label="Организатор (ФИО)" value={form.organizerName} onChange={(organizerName) => onPatch({ organizerName })} />
      <p className="text-sm text-on-surface-variant">
        По умолчанию — ваше имя из профиля. Можно указать другого человека: он не обязательно должен быть зарегистрирован в системе — просто отображается на странице соревнования.
      </p>
      <TextInput label="Телефон" required type="tel" value={form.contactPhone} onChange={(contactPhone) => onPatch({ contactPhone })} />
      <TextInput label="Email" type="email" value={form.contactEmail} onChange={(contactEmail) => onPatch({ contactEmail })} />
      <h2 className="mt-2 text-base font-medium text-fg">Ссылки</h2>
      <TextInput label="Сайт соревнования" value={form.website} onChange={(website) => onPatch({ website })} />
    </div>
  )
}

interface DistancesStepProps {
  distances: PendingDistance[]
  importXmlName: string | null
  importedPreviews: XmlCoursePreview[]
  isPastEvent: boolean
  onAdd: () => void
  onRemove: (index: number) => void
  onPickXml: (file: File) => void
  onClearXml: () => void
}

export function DistancesStep({
  distances,
  importXmlName,
  importedPreviews,
  isPastEvent,
  onAdd,
  onRemove,
  onPickXml,
  onClearXml,
}: DistancesStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-fg">Дистанции</h2>
      <p className="text-sm text-on-surface-variant">
        {isPastEvent
          ? 'Можно пропустить, если детали дистанций неизвестны.'
          : 'Добавьте хотя бы одну дистанцию — её можно будет выбрать для групп на следующем шаге.'}
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
              <p key={i} className="text-sm text-fg">
                {p.name} — {p.lengthMeters} м, КП: {p.controlsCount}
              </p>
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
            <div className="flex flex-col">
              <span className="font-semibold text-fg">{d.name ?? 'Без названия'}</span>
              <span className="text-sm text-on-surface-variant">
                Длина: {d.lengthMeters} м • Набор: {d.climbMeters} м • КП: {d.controlPoints.length}
              </span>
            </div>
            <button type="button" onClick={() => onRemove(index)} className="text-sm text-error">
              Удалить
            </button>
          </div>
        ))
      )}
      <button type="button" onClick={onAdd} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        + Добавить дистанцию
      </button>
    </div>
  )
}

interface GroupsStepProps {
  groups: PendingGroup[]
  distanceOptions: [number, string][]
  isPastEvent: boolean
  onAdd: () => void
  onRemove: (index: number) => void
}

export function GroupsStep({ groups, distanceOptions, isPastEvent, onAdd, onRemove }: GroupsStepProps) {
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
          const distName = distanceOptions.find(([key]) => key === g.distanceIndex)?.[1] ?? '—'
          const ageStr = g.minAge != null || g.maxAge != null ? `${g.minAge ?? ''}–${g.maxAge ?? ''} лет  •  ` : ''
          return (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-fg">{g.title}</span>
                <span className="text-sm text-on-surface-variant">
                  {ageStr}Дистанция: {distName}
                </span>
              </div>
              <button type="button" onClick={() => onRemove(index)} className="text-sm text-error">
                Удалить
              </button>
            </div>
          )
        })
      )}
      <button type="button" onClick={onAdd} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
        + Добавить группу
      </button>
    </div>
  )
}
