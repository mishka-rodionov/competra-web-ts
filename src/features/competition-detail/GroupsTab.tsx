import { useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'
import type { ParticipantGroupDetail, RegisterEventRequest } from '../../types/competition'
import { genderLabel } from '../competitions/labels'
import { RegistrationDialog } from './RegistrationDialog'

interface GroupsTabProps {
  competitionId: string
  groups: ParticipantGroupDetail[]
  /** IGNORE / DISQUALIFY / SCORE_PENALTY — влияет только на подпись к КВ. */
  overtimePolicy: string
  registrationOpen: boolean
  registeredGroupId: number | null
  registerError: string | null
  onRegister: (request: RegisterEventRequest) => void
  onCancelRegistration: () => void
}

export function GroupsTab({
  competitionId,
  groups,
  overtimePolicy,
  registrationOpen,
  registeredGroupId,
  registerError,
  onRegister,
  onCancelRegistration,
}: GroupsTabProps) {
  const isLoggedIn = useIsLoggedIn()
  const [dialogGroup, setDialogGroup] = useState<ParticipantGroupDetail | null>(null)
  const anyRegistered = registeredGroupId != null

  return (
    <div className="flex flex-col gap-2 p-4">
      {anyRegistered && (
        <div className="flex flex-col items-start gap-2">
          <span className="text-base text-primary">Вы зарегистрированы</span>
          {/* После завершения регистрации (в т.ч. досрочного, организатором) отменить её нельзя. */}
          {registrationOpen ? (
            <button
              type="button"
              onClick={onCancelRegistration}
              className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
            >
              Отменить регистрацию
            </button>
          ) : (
            <span className="text-sm text-on-surface-variant">Регистрация завершена — отменить её уже нельзя</span>
          )}
        </div>
      )}
      {registerError && <ErrorMessage message={registerError} />}

      {groups.length === 0 ? (
        <EmptyState text="Группы ещё не добавлены" />
      ) : (
        groups.map((group) => (
          <GroupCard
            key={group.groupId}
            group={group}
            overtimePolicy={overtimePolicy}
            isLoggedIn={isLoggedIn}
            registrationOpen={registrationOpen}
            isRegistered={registeredGroupId === group.groupId}
            anyRegistered={anyRegistered}
            onRegister={() => setDialogGroup(group)}
          />
        ))
      )}

      {dialogGroup && (
        <RegistrationDialog
          group={dialogGroup}
          competitionId={competitionId}
          onDismiss={() => setDialogGroup(null)}
          onConfirm={(request) => {
            onRegister(request)
            setDialogGroup(null)
          }}
        />
      )}
    </div>
  )
}

interface GroupCardProps {
  group: ParticipantGroupDetail
  overtimePolicy: string
  isLoggedIn: boolean
  registrationOpen: boolean
  isRegistered: boolean
  anyRegistered: boolean
  onRegister: () => void
}

function GroupCard({
  group,
  overtimePolicy,
  isLoggedIn,
  registrationOpen,
  isRegistered,
  anyRegistered,
  onRegister,
}: GroupCardProps) {
  const spotsLeft = group.maxParticipants != null ? group.maxParticipants - group.registeredCount : null
  const ageRange =
    group.minAge != null && group.maxAge != null
      ? `${group.minAge}–${group.maxAge} лет`
      : group.minAge != null
        ? `от ${group.minAge} лет`
        : group.maxAge != null
          ? `до ${group.maxAge} лет`
          : null

  const distInfo = group.distanceName
    ? [
        group.distanceName,
        group.distanceLengthMeters && group.distanceLengthMeters > 0 ? `${group.distanceLengthMeters} м` : null,
        group.distanceClimbMeters && group.distanceClimbMeters > 0 ? `набор ${group.distanceClimbMeters} м` : null,
        group.distanceControlsCount != null ? `${group.distanceControlsCount} КП` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  // При IGNORE КВ справочное — говорим об этом прямо, иначе участник решит, что его снимут.
  const controlTime =
    group.controlTimeMinutes != null
      ? overtimePolicy === 'DISQUALIFY'
        ? `КВ: ${group.controlTimeMinutes} мин`
        : overtimePolicy === 'SCORE_PENALTY'
          ? `КВ: ${group.controlTimeMinutes} мин (штраф очками)`
          : `КВ: ${group.controlTimeMinutes} мин (справочно)`
      : null

  const isFull = spotsLeft != null && spotsLeft <= 0

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-fg">{group.title}</span>
        {spotsLeft != null && (
          <span className={`text-xs ${isFull ? 'text-error' : 'text-on-surface-variant'}`}>
            Мест: {spotsLeft}/{group.maxParticipants}
          </span>
        )}
      </div>
      {group.gender && <span className="text-sm text-on-surface-variant">{genderLabel(group.gender)}</span>}
      {ageRange && <span className="text-sm text-on-surface-variant">{ageRange}</span>}
      {distInfo && <span className="text-sm text-fg">{distInfo}</span>}
      {controlTime && <span className="text-sm text-on-surface-variant">{controlTime}</span>}
      {group.distanceDescription?.trim() && (
        <span className="text-sm text-on-surface-variant">{group.distanceDescription}</span>
      )}

      {isLoggedIn && registrationOpen && !anyRegistered ? (
        <button
          type="button"
          onClick={onRegister}
          disabled={isFull}
          className="mt-2 self-start rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
        >
          {isFull ? 'Мест нет' : 'Зарегистрироваться'}
        </button>
      ) : isRegistered ? (
        <span className="mt-2 text-sm font-medium text-primary">✓ Вы в этой группе</span>
      ) : null}
    </div>
  )
}
