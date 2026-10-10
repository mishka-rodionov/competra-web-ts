/**
 * Дозаявка после жеребьёвки: подбор стартового времени опоздавшего участника по правилам
 * проведённой жеребьёвки. Порт LateEntrySlotFinder из Android
 * (feature/center/.../data/draw/LateEntry.kt) — логика должна совпадать.
 */

/** Запас на подготовку опоздавшего (запись чипа, путь до старта) — раньше этого он не стартует. */
export const LATE_ENTRY_PREPARATION_MS = 2 * 60 * 1000

/** Самое раннее допустимое время старта дозаявленного: сейчас + запас на подготовку. */
export function lateEntryNotBefore(): number {
  return Date.now() + LATE_ENTRY_PREPARATION_MS
}

/** Режимы жеребьёвки (DrawMode в Android и eSport). */
export type DrawMode = 'GENERAL' | 'GROUP' | 'DISTANCE'

/** Куда поставить дозаявленного: свободная минута, конец протокола или вручную. */
export type LateEntryPlacement = 'FREE_SLOT' | 'END' | 'MANUAL'

export interface DrawSettings {
  mode: DrawMode
  /** Коридоры жеребьёвки по дистанциям. */
  corridors: number | null
  /** Зазор жеребьёвки по дистанциям, в стартовых интервалах. */
  gap: number | null
}

/** Старт в протоколе, занимающий стартовую минуту. */
export interface ProtocolStart {
  startTime: number
  groupId: number
}

/** 1 января 2000 года — более ранние стартовые времена считаются незаданными (как в Android). */
const MIN_VALID_TIMESTAMP_MS = 946_684_800_000

export function isValidStartTimestamp(ms: number | null | undefined): ms is number {
  return ms != null && ms >= MIN_VALID_TIMESTAMP_MS
}

/** Сохранённый режим жеребьёвки соревнования; null — не проводилась или неизвестен. */
export function drawSettingsOf(competition: {
  drawMode?: string | null
  drawCorridors?: number | null
  drawGap?: number | null
}): DrawSettings | null {
  const mode = competition.drawMode
  if (mode !== 'GENERAL' && mode !== 'GROUP' && mode !== 'DISTANCE') return null
  return { mode, corridors: competition.drawCorridors ?? null, gap: competition.drawGap ?? null }
}

export interface LateEntryInput {
  /** Старты протокола (только участники с валидным временем). */
  starts: ProtocolStart[]
  /** groupId → distanceId; без записи ключом дистанции служит groupId. */
  groupDistance: Map<number, number>
  /** Режим проведённой жеребьёвки; null — жеребьёвка старой версии, правило выводится из протокола. */
  drawSettings: DrawSettings | null
  intervalMs: number
  /** Начало сетки, если в протоколе ещё нет стартов. */
  fallbackAnchor: number
  /** Раньше этого момента ставить нельзя. */
  notBefore: number
}

/**
 * Подбирает стартовые минуты для дозаявки. Протокол — сетка минут с шагом intervalMs от самого
 * раннего старта; время, введённое вручную не по сетке, относится к ближайшей минуте.
 */
export function createLateEntrySlotFinder(input: LateEntryInput) {
  const intervalMs = Math.max(1, input.intervalMs)
  const anchor = input.starts.length > 0 ? Math.min(...input.starts.map((s) => s.startTime)) : input.fallbackAnchor
  const slotOf = (time: number) => Math.round((time - anchor) / intervalMs)
  const timeOf = (slot: number) => anchor + slot * intervalMs
  const distanceOf = (groupId: number) => input.groupDistance.get(groupId) ?? groupId

  const slotStarts = new Map<number, ProtocolStart[]>()
  for (const start of input.starts) {
    const slot = slotOf(start.startTime)
    slotStarts.set(slot, [...(slotStarts.get(slot) ?? []), start])
  }
  const startsIn = (slot: number) => slotStarts.get(slot) ?? []
  const firstAllowedSlot = input.notBefore <= anchor ? 0 : Math.ceil((input.notBefore - anchor) / intervalMs)

  function isFreeByDistance(slot: number, groupId: number, corridors: number, gap: number): boolean {
    if (startsIn(slot).length >= corridors) return false
    const distance = distanceOf(groupId)
    // Участники той же дистанции не ближе gap минут — как в жеребьёвке по дистанциям.
    for (let near = slot - gap + 1; near <= slot + gap - 1; near++) {
      if (startsIn(near).some((s) => distanceOf(s.groupId) === distance)) return false
    }
    return true
  }

  function isFree(slot: number, groupId: number): boolean {
    const settings = input.drawSettings
    switch (settings?.mode) {
      case 'GENERAL':
        return startsIn(slot).length === 0
      case 'GROUP':
        return !startsIn(slot).some((s) => s.groupId === groupId)
      case 'DISTANCE':
        return isFreeByDistance(slot, groupId, Math.max(1, settings.corridors ?? 1), Math.max(1, settings.gap ?? 1))
      default: {
        // Режим неизвестен — коридоров не больше, чем уже есть в протоколе, и одна дистанция на минуту.
        const maxLoad = Math.max(1, ...[...slotStarts.values()].map((s) => s.length))
        return isFreeByDistance(slot, groupId, maxLoad, 1)
      }
    }
  }

  return {
    /** Время ближайшей минуты, свободной для участника группы. */
    freeSlot(groupId: number): number {
      let slot = firstAllowedSlot
      while (!isFree(slot, groupId)) slot++
      return timeOf(slot)
    },
    /** Время сразу после последнего старта протокола (но не раньше допустимого). */
    endOfProtocol(): number {
      const lastSlot = slotStarts.size > 0 ? Math.max(...slotStarts.keys()) : -1
      return timeOf(Math.max(lastSlot + 1, firstAllowedSlot))
    },
  }
}
