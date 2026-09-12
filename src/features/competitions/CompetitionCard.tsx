import { toLocaleDateString } from '../../lib/dateUtils'
import type { Competition } from '../../types/competition'
import { statusColorClass, statusLabel } from './labels'

interface CompetitionCardProps {
  competition: Competition
  onClick: () => void
}

export function CompetitionCard({ competition, onClick }: CompetitionCardProps) {
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
      <span className="text-sm text-on-surface-variant">{toLocaleDateString(competition.startDate)}</span>
      {competition.address && <span className="text-sm text-on-surface-variant">{competition.address}</span>}
    </button>
  )
}
