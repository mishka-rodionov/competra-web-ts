import { useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { formatTime } from '../../lib/dateUtils'
import { overallScopeLabel } from '../../lib/teamScoring'
import type { GroupTeam, OverallTeam, TeamMemberResult } from '../../types/teamStandings'
import { resultStatusLabel } from '../competitions/labels'
import { useTeamStandings } from './hooks'

const GROUPS_TAB = 'GROUPS'

interface TeamStandingsViewProps {
  competitionId: string
  competitionStatus: string
}

/**
 * Командный зачёт (docs/specs/team-scoring.md в competra-android): чипы общих зачётов и «По группам»;
 * строка команды раскрывается результатами — вошедшими в зачёт и (бледнее) остальными. Считает сервер.
 */
export function TeamStandingsView({ competitionId, competitionStatus }: TeamStandingsViewProps) {
  const { data: standings, isLoading, isError, error } = useTeamStandings(competitionId, competitionStatus, true)
  const [selected, setSelected] = useState<string | null>(null)

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />
  if (!standings) return null

  const tabs = [
    ...standings.overallStandings.map((s) => s.scope),
    ...(standings.groupStandings.length > 0 ? [GROUPS_TAB] : []),
  ]
  if (tabs.length === 0) return <EmptyState text="Командный зачёт пока пуст: нет результатов участников с командой" />
  const current = selected != null && tabs.includes(selected) ? selected : tabs[0]
  const overall = standings.overallStandings.find((s) => s.scope === current)

  return (
    <div className="flex flex-col gap-3">
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelected(tab)}
              className={`rounded-full border px-3 py-1 text-sm ${
                tab === current ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'
              }`}
            >
              {tab === GROUPS_TAB ? 'По группам' : overallScopeLabel(tab)}
            </button>
          ))}
        </div>
      )}

      {current === GROUPS_TAB ? (
        standings.groupStandings.map((group) => (
          <div key={group.groupId} className="rounded-lg border border-outline-variant bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-fg">
              {group.groupTitle}
              {group.countedResults != null && (
                <span className="font-normal text-on-surface-variant"> · в зачёт {group.countedResults}</span>
              )}
            </h3>
            {group.teams.map((team) => (
              <GroupTeamRow key={team.teamName} team={team} />
            ))}
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface p-4">
          {overall?.teams.map((team) => <OverallTeamRow key={team.teamName} team={team} />)}
        </div>
      )}
    </div>
  )
}

function TeamRowHeader({ place, name, total, onClick }: { place?: number | null; name: string; total: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 py-2 text-left text-sm">
      <span className="w-8 font-semibold text-fg">{place ?? '—'}</span>
      <span className="flex-1 text-fg">{name}</span>
      <span className="font-semibold text-fg">{total}</span>
    </button>
  )
}

function GroupTeamRow({ team }: { team: GroupTeam }) {
  const [expanded, setExpanded] = useState(false)
  const total =
    team.points != null ? `${team.points} оч.` : team.timeSeconds != null ? formatTime(team.timeSeconds) : 'вне зачёта'
  return (
    <div className="border-b border-outline-variant last:border-0">
      <TeamRowHeader place={team.place} name={team.teamName} total={total} onClick={() => setExpanded(!expanded)} />
      {expanded && team.members.map((member) => <MemberRow key={member.participantId} member={member} />)}
    </div>
  )
}

function MemberRow({ member }: { member: TeamMemberResult }) {
  const result =
    member.status !== 'FINISHED'
      ? resultStatusLabel(member.status)
      : member.points > 0
        ? `${member.place} м. · ${member.points} оч.`
        : [member.place != null ? `${member.place} м.` : null, member.timeSeconds != null ? formatTime(member.timeSeconds) : null]
            .filter(Boolean)
            .join(' · ')
  return (
    <div className={`flex gap-2 pb-1 pl-10 text-sm ${member.counted ? 'text-fg' : 'text-on-surface-variant'}`}>
      <span className="flex-1">
        {member.lastName} {member.firstName}
      </span>
      <span>{result}</span>
    </div>
  )
}

function OverallTeamRow({ team }: { team: OverallTeam }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-outline-variant last:border-0">
      <TeamRowHeader place={team.place} name={team.teamName} total={`${team.points} оч.`} onClick={() => setExpanded(!expanded)} />
      {expanded &&
        team.groups.map((group) => (
          <div key={group.groupId} className="flex gap-2 pb-1 pl-10 text-sm text-fg">
            <span className="flex-1">{group.groupTitle}</span>
            <span>
              {group.place} м. · {group.points} оч.
            </span>
          </div>
        ))}
    </div>
  )
}
