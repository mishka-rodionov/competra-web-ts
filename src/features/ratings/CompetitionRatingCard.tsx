import { toLocaleDateString } from '../../lib/dateUtils'
import type { RatingCompetition } from '../../types/rating'

interface CompetitionRatingCardProps {
  competition: RatingCompetition
  isAdmin: boolean
  onMappingClick: () => void
  onRemove: () => void
}

export function CompetitionRatingCard({ competition, isAdmin, onMappingClick, onRemove }: CompetitionRatingCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface p-3">
      <div className="flex-1">
        <div className="text-fg">{competition.competitionTitle}</div>
        <div className="text-xs text-on-surface-variant">{toLocaleDateString(competition.competitionStartDate)}</div>
      </div>
      {isAdmin && (
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={onMappingClick} className="text-sm text-fg">
            Маппинг
          </button>
          <button type="button" onClick={onRemove} className="text-sm text-error">
            Удалить
          </button>
        </div>
      )}
    </div>
  )
}
