/** Метка группы, которой ещё не назначена дистанция. */
export function NoDistanceBadge() {
  return (
    <span className="self-start rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container">
      без дистанции
    </span>
  )
}

interface GroupsWithoutDistanceBannerProps {
  titles: string[]
  /** Переход к месту, где дистанцию можно назначить; не задан — кнопки нет. */
  onOpenGroups?: () => void
}

/** Напоминание организатору: к старту у каждой группы должна быть дистанция. */
export function GroupsWithoutDistanceBanner({ titles, onOpenGroups }: GroupsWithoutDistanceBannerProps) {
  if (titles.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-secondary-container p-3 text-on-secondary-container sm:flex-row sm:items-center">
      <p className="flex-1 text-sm">
        {titles.length === 1 ? 'У группы' : 'У групп'} {titles.join(', ')} не назначена дистанция. Регистрация работает, но до
        старта назначьте дистанции — без них не провести жеребьёвку по дистанциям, чтение чипов и публикацию результатов.
      </p>
      {onOpenGroups && (
        <button
          type="button"
          onClick={onOpenGroups}
          className="shrink-0 self-start rounded-md border border-on-secondary-container/40 px-3 py-1.5 text-sm sm:self-center"
        >
          К группам
        </button>
      )}
    </div>
  )
}
