import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'
import { birthYearsRange, checkGroupEligibility, type GroupEligibility } from '../../lib/groupEligibility'
import type { ParticipantGroupDetail, RegisterEventRequest } from '../../types/competition'
import type { UserProfile } from '../../types/user'
import { genderLabel } from '../competitions/labels'
import { RegistrationDialog } from './RegistrationDialog'

interface GroupsTabProps {
  competitionId: string
  groups: ParticipantGroupDetail[]
  /** Год соревнования в его часовом поясе — от него считается возраст (по году рождения). */
  competitionYear: number
  /** Профиль вошедшего пользователя — для проверки пола и возраста; null — не вошёл или грузится. */
  profile: UserProfile | null
  /** IGNORE / DISQUALIFY / SCORE_PENALTY — влияет только на подпись к КВ. */
  overtimePolicy: string
  registrationOpen: boolean
  registeredGroupId: number | null
  /** Профиль или список участников ещё грузятся — неизвестно, зарегистрирован ли пользователь. */
  registrationStatusLoading: boolean
  registerError: string | null
  onRegister: (request: RegisterEventRequest) => void
  onCancelRegistration: () => void
}

export function GroupsTab({
  competitionId,
  groups,
  competitionYear,
  profile,
  overtimePolicy,
  registrationOpen,
  registeredGroupId,
  registrationStatusLoading,
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
            competitionYear={competitionYear}
            eligibility={profile ? checkGroupEligibility(group, profile, competitionYear) : { eligible: true }}
            canRegister={isLoggedIn && !registrationStatusLoading}
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
  competitionYear: number
  eligibility: GroupEligibility
  canRegister: boolean
  registrationOpen: boolean
  isRegistered: boolean
  anyRegistered: boolean
  onRegister: () => void
}

function GroupCard({
  group,
  overtimePolicy,
  competitionYear,
  eligibility,
  canRegister,
  registrationOpen,
  isRegistered,
  anyRegistered,
  onRegister,
}: GroupCardProps) {
  const spotsLeft = group.maxParticipants != null ? group.maxParticipants - group.registeredCount : null
  const minAge = group.minAge != null && group.minAge > 0 ? group.minAge : null
  const maxAge = group.maxAge != null && group.maxAge > 0 ? group.maxAge : null
  // Возраст считается по году рождения — поэтому рядом показываем и сами годы.
  const ageRange =
    minAge == null && maxAge == null
      ? null
      : `${
          minAge != null && maxAge != null
            ? `${minAge}–${maxAge} лет`
            : minAge != null
              ? `от ${minAge} лет`
              : `до ${maxAge} лет`
        } (${birthYearsRange(minAge, maxAge, competitionYear)})`

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
      {genderLabel(group.gender) && (
        <span className="text-sm text-on-surface-variant">{genderLabel(group.gender)}</span>
      )}
      {ageRange && <span className="text-sm text-on-surface-variant">{ageRange}</span>}
      {distInfo && <span className="text-sm text-fg">{distInfo}</span>}
      {controlTime && <span className="text-sm text-on-surface-variant">{controlTime}</span>}
      {group.distanceDescription?.trim() && (
        <span className="text-sm text-on-surface-variant">{group.distanceDescription}</span>
      )}

      {canRegister && registrationOpen && !anyRegistered ? (
        <>
          <button
            type="button"
            onClick={onRegister}
            disabled={isFull || !eligibility.eligible}
            className="mt-2 self-start rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
          >
            {isFull ? 'Мест нет' : 'Зарегистрироваться'}
          </button>
          {!isFull && !eligibility.eligible && (
            <span className="text-sm text-on-surface-variant">
              {eligibility.reason}
              {eligibility.fixInProfile && (
                <>
                  {' · '}
                  <Link to="/profile/edit" className="text-primary underline">
                    Заполнить профиль
                  </Link>
                </>
              )}
            </span>
          )}
        </>
      ) : isRegistered ? (
        <span className="mt-2 text-sm font-medium text-primary">✓ Вы в этой группе</span>
      ) : null}
    </div>
  )
}
