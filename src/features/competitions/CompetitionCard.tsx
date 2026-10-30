import { competitionStartTime, DEFAULT_TIME_ZONE, toLocaleDateString } from '../../lib/dateUtils'
import type { Competition } from '../../types/competition'
import { statusColorClass, statusLabel } from './labels'

interface CompetitionCardProps {
  competition: Competition
  onClick: () => void
}

export function CompetitionCard({ competition, onClick }: CompetitionCardProps) {
  const zone = competition.timeZoneId || DEFAULT_TIME_ZONE
  // Список (/public) не отдаёт фактический startTime — только плановое время из startDate.
  const startTime = competitionStartTime(competition.startDate, null, zone)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex-1 text-base font-medium text-fg">{competition.title}</span>
        <span className={`shrink-0 text-xs font-medium ${statusColorClass(competition.status)}`}>
          {statusLabel(competition.status)}
        </span>
      </div>
      <span className="text-sm text-on-surface-variant">
        {toLocaleDateString(competition.startDate, zone)}
        {startTime && `, ${startTime}`}
        {competition.isTest && <span className="ml-2 font-medium text-tertiary">Тестовое</span>}
      </span>
      {competition.address && <span className="text-sm text-on-surface-variant">{competition.address}</span>}
    </button>
  )
}
