import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { DEFAULT_TIME_ZONE, utcMillisToZonedTime } from '../../lib/dateUtils'
import { groupGenderRestriction } from '../../lib/groupEligibility'
import type { ParticipantGroupDetail } from '../../types/competition'
import type { OrienteeringParticipant } from '../../types/participant'
import type { Gender } from '../../types/user'
import { useParticipants } from './hooks'

/**
 * Мужские группы первыми, затем женские, остальные — в конце. Поле gender у групп заполняется
 * редко, поэтому при отсутствии пол определяется по префиксу названия ("М17", "Ж21").
 */
function inferGenderFromTitle(title: string): Gender | null {
  if (title.toUpperCase().startsWith('М')) return 'male'
  if (title.toUpperCase().startsWith('Ж')) return 'female'
  return null
}

function sortedStartGroups(groups: ParticipantGroupDetail[]): ParticipantGroupDetail[] {
  function priority(group: ParticipantGroupDetail): number {
    const gender = groupGenderRestriction(group.gender) ?? inferGenderFromTitle(group.title)
    return gender === 'male' ? 0 : gender === 'female' ? 1 : 2
  }
  return [...groups].sort((a, b) => priority(a) - priority(b))
}

function formatStartInterval(minute: number): string {
  return `${minute.toString().padStart(2, '0')}:00`
}

interface StartProtocolTabProps {
  competitionId: string
  groups: ParticipantGroupDetail[]
  timeZoneId: string
}

export function StartProtocolTab({ competitionId, groups, timeZoneId }: StartProtocolTabProps) {
  const { data: participants, isLoading, isError, error } = useParticipants(competitionId)

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />
  if (!participants || participants.length === 0) return <EmptyState text="Участники ещё не зарегистрированы" />

  const zone = timeZoneId || DEFAULT_TIME_ZONE

  // Стартовая минута — порядковый номер физического времени старта среди всех различных
  // времён старта (1-я, 2-я, ...). При массовом старте у всех одно время — все в 1-й минуте.
  const distinctStartTimes = [...new Set(participants.map((p) => p.startTime).filter((t): t is number => t != null))].sort(
    (a, b) => a - b,
  )
  const minuteByStartTime = new Map(distinctStartTimes.map((time, idx) => [time, idx + 1]))

  const participantsByGroup = new Map<number, OrienteeringParticipant[]>()
  for (const p of participants) {
    const list = participantsByGroup.get(p.groupId) ?? []
    list.push(p)
    participantsByGroup.set(p.groupId, list)
  }

  const groupOrder = sortedStartGroups(groups).map((g) => g.groupId)
  const extraGroupIds = [...participantsByGroup.keys()].filter((id) => !groupOrder.includes(id))
  const sortedGroupIds = [...groupOrder, ...extraGroupIds].filter((id) => (participantsByGroup.get(id)?.length ?? 0) > 0)
  const groupNamesById = new Map(groups.map((g) => [g.groupId, g.title]))

  return (
    <div className="flex flex-col gap-3 p-4">
      {sortedGroupIds.map((groupId) => {
        const groupParticipants = [...(participantsByGroup.get(groupId) ?? [])].sort((a, b) => {
          const startDiff = (a.startTime ?? Infinity) - (b.startTime ?? Infinity)
          if (startDiff !== 0) return startDiff
          return (Number(a.startNumber) || Infinity) - (Number(b.startNumber) || Infinity)
        })
        return (
          <div key={groupId} className="rounded-lg border border-outline-variant bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-fg">{groupNamesById.get(groupId) ?? `Группа ${groupId}`}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
                  <th className="py-1 pr-2 font-normal">№</th>
                  <th className="py-1 pr-2 font-normal">Участник</th>
                  <th className="py-1 pr-2 font-normal">Время старта</th>
                  <th className="py-1 font-normal">Интервал</th>
                </tr>
              </thead>
              <tbody>
                {groupParticipants.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant last:border-0">
                    <td className="py-2 pr-2 text-fg">{p.startNumber ?? '—'}</td>
                    <td className="py-2 pr-2">
                      <div className="text-fg">
                        {p.lastName} {p.firstName}
                      </div>
                      {p.commandName && <div className="text-xs text-on-surface-variant">{p.commandName}</div>}
                    </td>
                    <td className="py-2 pr-2 text-fg">{p.startTime != null ? utcMillisToZonedTime(p.startTime, zone) : '—'}</td>
                    <td className="py-2 text-fg">
                      {p.startTime != null && minuteByStartTime.has(p.startTime)
                        ? formatStartInterval(minuteByStartTime.get(p.startTime)!)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
