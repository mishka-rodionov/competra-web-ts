import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { participantLinkRepository } from '../../api/participantLinkRepository'
import { resultRepository } from '../../api/resultRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LabeledSelect } from '../../components/LabeledSelect'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import { DEFAULT_TIME_ZONE, utcMillisToZonedDate, utcMillisToZonedTime, zonedDateTimeToUtcMillis } from '../../lib/dateUtils'
import {
  createLateEntrySlotFinder,
  drawSettingsOf,
  isValidStartTimestamp,
  lateEntryNotBefore,
  type LateEntryPlacement,
} from '../../lib/lateEntry'
import type { OrienteeringCompetition, ParticipantGroupDetail } from '../../types/competition'
import type { OrienteeringParticipant } from '../../types/participant'
import { invalidateLinkQueries } from '../participant-links/hooks'

interface ParticipantEditorDialogProps {
  competition: OrienteeringCompetition
  groups: ParticipantGroupDetail[]
  /** Все участники соревнования — для номера и стартовой минуты дозаявки. */
  participants: OrienteeringParticipant[]
  defaultGroupId: number | undefined
  editingParticipant: OrienteeringParticipant | null
  onDismiss: () => void
  onSaved: () => void
}

export function ParticipantEditorDialog({
  competition,
  groups,
  participants,
  defaultGroupId,
  editingParticipant,
  onDismiss,
  onSaved,
}: ParticipantEditorDialogProps) {
  const zoneId = competition.competition.timeZoneId || DEFAULT_TIME_ZONE
  const baseDateMillis = competition.competition.startDate

  // Дозаявка после жеребьёвки: номер — следующий сквозной, время — свободная минута по правилам
  // жеребьёвки, конец протокола или вручную. При старте по стартовой станции время берётся из отметки.
  const drawSettings = drawSettingsOf(competition)
  const isLateEntry =
    !editingParticipant &&
    (drawSettings != null || competition.isDrawConducted === true) &&
    competition.startTimeMode !== 'BY_START_STATION'
  const nextStartNumber = Math.max(0, ...participants.map((p) => parseInt(p.startNumber ?? '', 10)).filter((n) => !Number.isNaN(n))) + 1
  const [placement, setPlacement] = useState<LateEntryPlacement>('FREE_SLOT')
  // Момент открытия диалога — для предпросмотра; при сохранении время пересчитывается заново.
  const [previewNotBefore] = useState(lateEntryNotBefore)

  function lateEntryFinder(notBefore: number) {
    return createLateEntrySlotFinder({
      starts: participants
        .filter((p) => isValidStartTimestamp(p.startTime))
        .map((p) => ({ startTime: p.startTime as number, groupId: p.groupId })),
      groupDistance: new Map(groups.filter((g) => g.distanceId != null).map((g) => [g.groupId, g.distanceId as number])),
      drawSettings,
      intervalMs: (competition.startIntervalSeconds ?? 60) * 1000,
      fallbackAnchor: isValidStartTimestamp(competition.startTime) ? competition.startTime : baseDateMillis,
      notBefore,
    })
  }

  const [lastName, setLastName] = useState(editingParticipant?.lastName ?? '')
  const [firstName, setFirstName] = useState(editingParticipant?.firstName ?? '')
  const [commandName, setCommandName] = useState(editingParticipant?.commandName ?? '')
  const [startNumber, setStartNumber] = useState(editingParticipant?.startNumber ?? (isLateEntry ? String(nextStartNumber) : ''))
  const [groupId, setGroupId] = useState<number>(editingParticipant?.groupId ?? defaultGroupId ?? groups[0]?.groupId ?? 0)
  const [startTimeStr, setStartTimeStr] = useState(
    editingParticipant?.startTime != null ? utcMillisToZonedTime(editingParticipant.startTime, zoneId) : '10:00',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewFinder = isLateEntry ? lateEntryFinder(previewNotBefore) : null
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const queryClient = useQueryClient()

  // Привязка к аккаунту меняется только отдельным запросом: сохранение участника userId не трогает.
  async function handleUnlink() {
    if (!editingParticipant) return
    setSaving(true)
    setError(null)
    const result = await participantLinkRepository.unlinkParticipant(editingParticipant.id)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.resultUnlinked(competition.competitionId, 'organizer'))
      await invalidateLinkQueries(queryClient, competition.competitionId)
      onSaved()
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  async function handleSave() {
    const group = groups.find((g) => g.groupId === groupId)
    const numberInt = parseInt(startNumber, 10)
    if (!lastName.trim() || !firstName.trim() || Number.isNaN(numberInt) || !group) {
      setError('Заполните фамилию, имя и номер старта (числом)')
      return
    }
    setSaving(true)
    setError(null)
    // Стартовое время участника — на календарную дату старта соревнования (в UTC, как и
    // старая Kotlin-версия: zonedDateTimeToUtcMillis там брал именно UTC-дату из millis, а не
    // локальную дату в зоне соревнования), плюс выбранное время в этой зоне.
    let startTimeMillis = zonedDateTimeToUtcMillis(utcMillisToZonedDate(baseDateMillis, 'UTC'), startTimeStr, zoneId)
    if (isLateEntry) {
      const finder = lateEntryFinder(lateEntryNotBefore())
      if (placement === 'FREE_SLOT') startTimeMillis = finder.freeSlot(group.groupId)
      else if (placement === 'END') startTimeMillis = finder.endOfProtocol()
      // Вручную — на дату протокола (дату ближайшей свободной минуты в зоне соревнования).
      else startTimeMillis = zonedDateTimeToUtcMillis(utcMillisToZonedDate(finder.freeSlot(group.groupId), zoneId), startTimeStr, zoneId)
    }
    const result = await resultRepository.saveParticipant({
      id: editingParticipant?.id ?? crypto.randomUUID(),
      userId: editingParticipant?.userId ?? null,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      groupId: group.groupId,
      groupName: group.title,
      competitionId: competition.competitionId,
      commandName: commandName.trim() || null,
      startNumber: numberInt,
      startTime: startTimeMillis,
      // После жеребьёвки у Sportiduino номер чипа равен стартовому номеру — иначе дозаявленного
      // не найти при считывании чипа.
      chipNumber: isLateEntry && competition.punchingSystem === 'SPORTIDUINO' ? numberInt : (editingParticipant?.chipNumber ?? 0),
      comment: editingParticipant?.comment ?? null,
      isChipGiven: editingParticipant?.isChipGiven ?? false,
    })
    if (result.kind === 'success') {
      if (!editingParticipant) analytics.trackEvent(AnalyticsEvents.participantAdded('manual'))
      onSaved()
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">{editingParticipant ? 'Редактирование участника' : 'Новый участник'}</h3>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Фамилия"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Имя"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <LabeledSelect label="Группа" value={groupId} options={groups.map((g) => [g.groupId, g.title] as [number, string])} onChange={setGroupId} />
        <input
          value={startNumber}
          onChange={(e) => setStartNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="Номер старта"
          inputMode="numeric"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        {previewFinder && (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm text-on-surface-variant">Время старта</legend>
            {(
              [
                ['FREE_SLOT', `Свободная минута · ${utcMillisToZonedTime(previewFinder.freeSlot(groupId), zoneId)}`],
                ['END', `В конец протокола · ${utcMillisToZonedTime(previewFinder.endOfProtocol(), zoneId)}`],
                ['MANUAL', 'Вручную'],
              ] as [LateEntryPlacement, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-fg">
                <input type="radio" name="late-entry-placement" checked={placement === value} onChange={() => setPlacement(value)} />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        {(!isLateEntry || placement === 'MANUAL') && (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Время старта</span>
            <input
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
            />
          </label>
        )}
        <input
          value={commandName}
          onChange={(e) => setCommandName(e.target.value)}
          placeholder="Команда (опционально)"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        {editingParticipant?.userId && (
          <div className="flex flex-col gap-2 rounded-md bg-primary/10 p-3">
            <span className="text-sm text-fg">Участник привязан к профилю пользователя</span>
            {confirmingUnlink ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-fg">Результат пропадёт из профиля спортсмена. Отвязать?</span>
                <button type="button" disabled={saving} onClick={handleUnlink} className="text-sm text-error disabled:opacity-50">
                  Отвязать
                </button>
                <button type="button" disabled={saving} onClick={() => setConfirmingUnlink(false)} className="text-sm text-fg">
                  Отмена
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmingUnlink(true)} className="self-start text-sm text-error">
                Отвязать от профиля
              </button>
            )}
          </div>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={saving}
            className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : editingParticipant ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}
