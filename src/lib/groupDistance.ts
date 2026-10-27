/**
 * Группа без дистанции — обычное состояние, пока идёт регистрация (дистанции ещё не спланированы),
 * но к старту дистанция должна быть назначена: без неё нельзя провести жеребьёвку по дистанциям,
 * прочитать чип и опубликовать результаты. Удалённую дистанцию тоже считаем неназначенной —
 * на сервере у группы остаётся висячий distanceId.
 */
export function hasAssignedDistance(group: { distanceId: number | null }, distances: { id: number }[]): boolean {
  return group.distanceId != null && distances.some((d) => d.id === group.distanceId)
}

export function groupsWithoutDistance<G extends { distanceId: number | null }>(groups: G[], distances: { id: number }[]): G[] {
  return groups.filter((g) => !hasAssignedDistance(g, distances))
}
