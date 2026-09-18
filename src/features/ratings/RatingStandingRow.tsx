import type { RatingStanding } from '../../types/rating'
import { startsCountLabel } from './labels'

const RANK_BADGE_CLASS: Record<number, string> = {
  1: 'bg-[#e0b00a] text-[#2a2a2a]',
  2: 'bg-[#a9b0b8] text-[#2a2a2a]',
  3: 'bg-[#c17a3e] text-[#2a2a2a]',
}

export function RatingStandingRow({ standing, onClick }: { standing: RatingStanding; onClick: () => void }) {
  const isTopThree = standing.rank >= 1 && standing.rank <= 3
  const badgeClass = RANK_BADGE_CLASS[standing.rank] ?? 'bg-surface-variant text-on-surface-variant'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border border-outline-variant p-3 text-left hover:bg-surface-variant/40 ${isTopThree ? 'bg-primary-container/30' : 'bg-surface'}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${badgeClass}`}>
        {isTopThree ? '🏆' : standing.rank}
      </div>
      <div className="flex-1">
        <div className="text-fg">{standing.displayName}</div>
        <div className="text-xs text-on-surface-variant">
          {standing.breakdown.length} {startsCountLabel(standing.breakdown.length)}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-base font-semibold text-primary">{standing.totalPoints}</span>
        <span className="text-xs text-on-surface-variant">очков</span>
      </div>
    </button>
  )
}
