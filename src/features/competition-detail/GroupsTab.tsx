import { EmptyState } from '../../components/EmptyState'
import type { ParticipantGroupDetail } from '../../types/competition'
import { genderLabel } from '../competitions/labels'

/**
 * Только просмотр — кнопка регистрации из старого приложения показывалась лишь залогиненным
 * пользователям (isLoggedIn && registrationOpen && !anyRegistered), а авторизация появится
 * только в вертикали 2. До тех пор это ровно то же состояние, что видел неавторизованный
 * пользователь в Kotlin-версии.
 */
export function GroupsTab({ groups }: { groups: ParticipantGroupDetail[] }) {
  if (groups.length === 0) return <EmptyState text="Группы ещё не добавлены" />

  return (
    <div className="flex flex-col gap-2 p-4">
      {groups.map((group) => (
        <GroupCard key={group.groupId} group={group} />
      ))}
    </div>
  )
}

function GroupCard({ group }: { group: ParticipantGroupDetail }) {
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

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-fg">{group.title}</span>
        {spotsLeft != null && (
          <span className={`text-xs ${spotsLeft <= 0 ? 'text-error' : 'text-on-surface-variant'}`}>
            Мест: {spotsLeft}/{group.maxParticipants}
          </span>
        )}
      </div>
      {group.gender && <span className="text-sm text-on-surface-variant">{genderLabel(group.gender)}</span>}
      {ageRange && <span className="text-sm text-on-surface-variant">{ageRange}</span>}
      {distInfo && <span className="text-sm text-fg">{distInfo}</span>}
      {group.distanceDescription?.trim() && (
        <span className="text-sm text-on-surface-variant">{group.distanceDescription}</span>
      )}
    </div>
  )
}
