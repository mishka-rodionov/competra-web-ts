import { EmptyState } from '../../components/EmptyState'
import { useRatingsForClub } from '../ratings/hooks'

interface ClubRatingsTabProps {
  clubId: string
  isAdmin: boolean
  onRatingClick: (ratingId: string) => void
  onCreateRating: () => void
}

export function ClubRatingsTab({ clubId, isAdmin, onRatingClick, onCreateRating }: ClubRatingsTabProps) {
  const { data: ratings } = useRatingsForClub(clubId)

  return (
    <div className="flex flex-col gap-2 p-4">
      {isAdmin && (
        <button type="button" onClick={onCreateRating} className="self-start rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
          + Создать рейтинг
        </button>
      )}
      {!ratings || ratings.length === 0 ? (
        <EmptyState text="Рейтингов пока нет" />
      ) : (
        ratings.map((rating) => (
          <button
            key={rating.id}
            type="button"
            onClick={() => onRatingClick(rating.id)}
            className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-3 text-left"
          >
            <span className="text-fg">{rating.name}</span>
            <span className="text-sm text-on-surface-variant">Групп: {rating.groups.length}</span>
          </button>
        ))
      )}
    </div>
  )
}
