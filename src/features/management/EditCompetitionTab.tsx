import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { competitionRepository } from '../../api/competitionRepository'
import { CoordinatesPickerField } from '../../components/CoordinatesPickerField'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LabeledSelect } from '../../components/LabeledSelect'
import { Loading } from '../../components/Loading'
import { TextInput } from '../../components/TextInput'
import { TimeZoneSelect } from '../../components/TimeZoneSelect'
import { DEFAULT_TIME_ZONE, utcMillisToZonedDate, utcMillisToZonedTime, zonedDateTimeToUtcMillis } from '../../lib/dateUtils'
import type { OrienteeringCompetition } from '../../types/competition'
import {
  DIRECTION_OPTIONS,
  formatIntervalSeconds,
  punchingSystemOptionsFor,
  START_INTERVAL_OPTIONS,
  START_TIME_MODE_OPTIONS,
  startTimeModePatch,
  STATUS_OPTIONS,
} from './dictionaries'
import { ControlTimeFields } from './ControlTimeFields'
import { LimitAndFeeFields } from './LimitAndFeeFields'

interface EditFormState {
  title: string
  startDateStr: string
  startTime: string
  zoneId: string
  endDateStr: string
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  status: string
  direction: string
  punchingSystem: string
  startTimeMode: string
  startInterval: number
  controlTimeMinutes: string
  overtimePolicy: string
  regStartDateStr: string
  regStartTime: string
  regEndDateStr: string
  regEndTime: string
  maxParticipants: string
  feeAmount: string
  organizerName: string
  contactEmail: string
  contactPhone: string
  website: string
  regulationUrl: string
  mapUrl: string
}

function toForm(competition: OrienteeringCompetition): EditFormState {
  const c = competition.competition
  const zoneId = c.timeZoneId || DEFAULT_TIME_ZONE
  return {
    title: c.title,
    startDateStr: c.startDate > 0 ? utcMillisToZonedDate(c.startDate, 'UTC') : '',
    startTime: c.startDate > 0 ? utcMillisToZonedTime(c.startDate, zoneId) : '10:00',
    zoneId,
    endDateStr: c.endDate != null ? utcMillisToZonedDate(c.endDate, 'UTC') : '',
    address: c.address ?? '',
    latitude: c.coordinates?.latitude ?? null,
    longitude: c.coordinates?.longitude ?? null,
    description: c.description ?? '',
    status: c.status,
    direction: competition.direction || 'FORWARD',
    punchingSystem: competition.punchingSystem || 'SPORTIDENT',
    startTimeMode: competition.startTimeMode || 'USER_SET',
    startInterval: competition.startIntervalSeconds ?? 60,
    controlTimeMinutes: competition.controlTimeMinutes?.toString() ?? '',
    overtimePolicy: competition.overtimePolicy || 'IGNORE',
    regStartDateStr: c.registrationStart != null ? utcMillisToZonedDate(c.registrationStart, 'UTC') : '',
    regStartTime: c.registrationStart != null ? utcMillisToZonedTime(c.registrationStart, zoneId) : '10:00',
    regEndDateStr: c.registrationEnd != null ? utcMillisToZonedDate(c.registrationEnd, 'UTC') : '',
    regEndTime: c.registrationEnd != null ? utcMillisToZonedTime(c.registrationEnd, zoneId) : '23:59',
    maxParticipants: c.maxParticipants?.toString() ?? '',
    feeAmount: c.feeAmount && c.feeAmount > 0 ? String(Math.trunc(c.feeAmount)) : '',
    organizerName: c.organizerName ?? '',
    contactEmail: c.contactEmail ?? '',
    contactPhone: c.contactPhone ?? '',
    website: c.website ?? '',
    regulationUrl: c.regulationUrl ?? '',
    mapUrl: c.mapUrl ?? '',
  }
}

export function EditCompetitionTab({ competition }: { competition: OrienteeringCompetition }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<EditFormState>(() => toForm(competition))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function patch(p: Partial<EditFormState>) {
    setForm((prev) => ({ ...prev, ...p }))
    setSuccess(false)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Укажите название')
      return
    }
    if (!form.startDateStr) {
      setError('Укажите дату начала')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)

    const c = competition.competition
    const result = await competitionRepository.createCompetition({
      competitionId: competition.competitionId,
      competition: {
        title: form.title.trim(),
        startDate: zonedDateTimeToUtcMillis(form.startDateStr, form.startTime, form.zoneId),
        endDate: form.endDateStr ? zonedDateTimeToUtcMillis(form.endDateStr, '00:00', form.zoneId) : null,
        kindOfSport: c.kindOfSport || 'Orienteering',
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        coordinates: form.latitude != null && form.longitude != null ? { latitude: form.latitude, longitude: form.longitude } : null,
        status: form.status,
        registrationStart: form.regStartDateStr ? zonedDateTimeToUtcMillis(form.regStartDateStr, form.regStartTime, form.zoneId) : null,
        registrationEnd: form.regEndDateStr ? zonedDateTimeToUtcMillis(form.regEndDateStr, form.regEndTime, form.zoneId) : null,
        maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants, 10) : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeAmount ? 'RUB' : c.feeCurrency,
        mainOrganizerId: c.mainOrganizerId,
        organizerName: form.organizerName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        website: form.website.trim() || null,
        regulationUrl: form.regulationUrl.trim() || null,
        mapUrl: form.mapUrl.trim() || null,
        imageUrl: c.imageUrl,
        resultsStatus: c.resultsStatus,
        timeZoneId: form.zoneId,
        isTest: c.isTest,
      },
      direction: form.direction,
      punchingSystem: form.punchingSystem,
      startTimeMode: form.startTimeMode,
      startIntervalSeconds: form.startInterval,
      controlTimeMinutes: form.controlTimeMinutes ? parseInt(form.controlTimeMinutes, 10) : null,
      overtimePolicy: form.overtimePolicy,
    })

    if (result.kind === 'success') {
      setSuccess(true)
      await queryClient.invalidateQueries({ queryKey: ['managed-competition', competition.competitionId] })
      await queryClient.invalidateQueries({ queryKey: ['my-competitions'] })
    } else {
      setError(result.message)
    }
    setSaving(false)
  }

  if (saving) return <Loading />

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-base font-medium text-fg">Основная информация</h2>
      <TextInput label="Название" required value={form.title} onChange={(title) => patch({ title })} />
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Дата начала *</span>
          <input
            type="date"
            value={form.startDateStr}
            onChange={(e) => patch({ startDateStr: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Время старта</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => patch({ startTime: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
      </div>
      <TimeZoneSelect zoneId={form.zoneId} onSelect={(zoneId) => patch({ zoneId })} />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-on-surface-variant">Дата окончания</span>
        <input
          type="date"
          value={form.endDateStr}
          onChange={(e) => patch({ endDateStr: e.target.value })}
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
      </label>
      <TextInput label="Место проведения" value={form.address} onChange={(address) => patch({ address })} />
      <CoordinatesPickerField
        latitude={form.latitude}
        longitude={form.longitude}
        onPick={(latitude, longitude) => patch({ latitude, longitude })}
      />
      <TextInput label="Описание" multiline value={form.description} onChange={(description) => patch({ description })} />
      <LabeledSelect label="Статус" value={form.status} options={STATUS_OPTIONS} onChange={(status) => patch({ status })} />

      <h2 className="mt-2 text-base font-medium text-fg">Параметры ориентирования</h2>
      <LabeledSelect label="Направление" value={form.direction} options={DIRECTION_OPTIONS} onChange={(direction) => patch({ direction })} />
      <LabeledSelect
        label="Система отметки"
        value={form.punchingSystem}
        options={punchingSystemOptionsFor(form.startTimeMode)}
        onChange={(punchingSystem) => patch({ punchingSystem })}
      />
      <LabeledSelect
        label="Режим старта"
        value={form.startTimeMode}
        options={START_TIME_MODE_OPTIONS}
        onChange={(startTimeMode) => patch(startTimeModePatch(startTimeMode, form.punchingSystem))}
      />
      {/* При старте по стартовой станции реальное время старта берётся из чипа — интервал не нужен. */}
      {form.startTimeMode !== 'BY_START_STATION' && (
        <LabeledSelect
          label="Интервал старта"
          value={form.startInterval}
          options={START_INTERVAL_OPTIONS.map((s) => [s, formatIntervalSeconds(s)] as [number, string])}
          onChange={(startInterval) => patch({ startInterval })}
        />
      )}
      <ControlTimeFields
        direction={form.direction}
        controlTimeMinutes={form.controlTimeMinutes}
        overtimePolicy={form.overtimePolicy}
        onChange={(patchValues) => patch(patchValues)}
      />

      <h2 className="mt-2 text-base font-medium text-fg">Регистрация</h2>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Начало регистрации</span>
          <input
            type="date"
            value={form.regStartDateStr}
            onChange={(e) => patch({ regStartDateStr: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Время</span>
          <input
            type="time"
            value={form.regStartTime}
            onChange={(e) => patch({ regStartTime: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Конец регистрации</span>
          <input
            type="date"
            value={form.regEndDateStr}
            onChange={(e) => patch({ regEndDateStr: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Время</span>
          <input
            type="time"
            value={form.regEndTime}
            onChange={(e) => patch({ regEndTime: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
      </div>
      <LimitAndFeeFields maxParticipants={form.maxParticipants} feeAmount={form.feeAmount} onChange={patch} />

      <h2 className="mt-2 text-base font-medium text-fg">Контакты</h2>
      <TextInput label="Организатор (ФИО)" value={form.organizerName} onChange={(organizerName) => patch({ organizerName })} />
      <TextInput label="Email организатора" type="email" value={form.contactEmail} onChange={(contactEmail) => patch({ contactEmail })} />
      <TextInput label="Телефон" type="tel" value={form.contactPhone} onChange={(contactPhone) => patch({ contactPhone })} />
      <TextInput label="Сайт соревнования" value={form.website} onChange={(website) => patch({ website })} />
      <TextInput label="Ссылка на положение" value={form.regulationUrl} onChange={(regulationUrl) => patch({ regulationUrl })} />
      <TextInput label="Ссылка на карту" value={form.mapUrl} onChange={(mapUrl) => patch({ mapUrl })} />

      {error && <ErrorMessage message={error} />}
      {success && <p className="text-sm text-primary">Сохранено</p>}

      <button type="button" onClick={handleSave} className="mt-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary">
        Сохранить
      </button>
    </div>
  )
}
