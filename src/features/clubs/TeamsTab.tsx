import { EmptyState } from '../../components/EmptyState'
import { sportLabel } from '../competitions/labels'
import type { Team } from '../../types/team'

interface TeamsTabProps {
  teams: Team[]
  isAdmin: boolean
  onTeamClick: (teamId: string) => void
  onAddTeam: () => void
}

export function TeamsTab({ teams, isAdmin, onTeamClick, onAddTeam }: TeamsTabProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {isAdmin && (
        <button type="button" onClick={onAddTeam} className="self-start rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
          + Добавить команду
        </button>
      )}
      {teams.length === 0 ? (
        <EmptyState text="Команд пока нет" />
      ) : (
        teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => onTeamClick(team.id)}
            className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-3 text-left"
          >
            <span className="text-fg">{team.name}</span>
            <span className="text-sm text-on-surface-variant">
              {sportLabel(team.sportType)} · {team.membersCount} участников
            </span>
          </button>
        ))
      )}
    </div>
  )
}
