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

/** Метка группы, которой нужно своё КВ (дистанция с баллами со штрафом, у соревнования КВ нет). */
export function NoControlTimeBadge() {
  return (
    <span className="self-start rounded-full bg-error/10 px-2 py-0.5 text-xs text-error">нужно КВ</span>
  )
}

interface GroupsWithoutControlTimeBannerProps {
  titles: string[]
  /** Где задать КВ. */
  hint: string
  /** Переход к группам; не задан — кнопки нет. */
  onOpenGroups?: () => void
}

/** Группам на дистанции «по выбору» по баллам нужно КВ: штраф начисляется после него, а у соревнования КВ нет. */
export function GroupsWithoutControlTimeBanner({ titles, hint, onOpenGroups }: GroupsWithoutControlTimeBannerProps) {
  if (titles.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-error/10 p-3 text-error sm:flex-row sm:items-center">
      <p className="flex-1 text-sm">
        {titles.length === 1 ? 'Группе' : 'Группам'} {titles.join(', ')} нужно контрольное время: на дистанции «по выбору» по
        баллам штраф начисляется после КВ, а у соревнования КВ не задано. {hint}
      </p>
      {onOpenGroups && (
        <button
          type="button"
          onClick={onOpenGroups}
          className="shrink-0 self-start rounded-md border border-error/40 px-3 py-1.5 text-sm sm:self-center"
        >
          К группам
        </button>
      )}
    </div>
  )
}
