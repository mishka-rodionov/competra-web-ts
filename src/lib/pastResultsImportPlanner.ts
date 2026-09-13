import type { ParsedPastResultRow, ParsedPastResultsFile } from './resultsExcelParser'
import type { ParticipantGroupDetail } from '../types/competition'
import type { OrienteeringParticipant } from '../types/participant'

/** Одна строка плана импорта — распознанные данные плюс уже существующий участник, если нашёлся. */
export interface PastResultsRowPlan {
  row: ParsedPastResultRow
  existingParticipant: OrienteeringParticipant | null
}

export interface PastResultsImportPlan {
  /** Названия групп, которых ещё нет в соревновании — будут созданы при импорте. */
  groupsToCreate: string[]
  /** Уже существующие в соревновании группы: название -> id. */
  existingGroupIdByTitle: Map<string, number>
  rowPlans: PastResultsRowPlan[]
  /** Строки файла, которые не удалось распознать. */
  skippedRows: number
  /**
   * Все участники соревнования на момент построения плана (не только сматченные из файла) —
   * нужны, чтобы новым участникам назначить стартовые номера, не пересекающиеся с уже
   * существующими (в т.ч. с теми, кого нет в этом Excel-файле вовсе).
   */
  existingParticipants: OrienteeringParticipant[]
}

/** Ищет группу по названию без учёта регистра — Excel и текущие группы могут отличаться регистром. */
export function findGroupIdIgnoreCase(byTitle: Map<string, number>, title: string): number | null {
  for (const [key, value] of byTitle) {
    if (key.toLowerCase() === title.toLowerCase()) return value
  }
  return null
}

/**
 * Строит план импорта: какие группы создать, каких участников создать (не найдены по ФИО+группе
 * среди уже заведённых), и результаты для всех строк. Побочных эффектов нет — сохранение делает
 * вызывающий код (диалог ревью) после подтверждения.
 */
export function buildPastResultsPlan(
  parsedFile: ParsedPastResultsFile,
  existingGroups: ParticipantGroupDetail[],
  existingParticipants: OrienteeringParticipant[],
): PastResultsImportPlan {
  const existingGroupIdByTitle = new Map(existingGroups.map((g) => [g.title, g.groupId]))
  const groupsToCreate = [...new Set(parsedFile.rows.map((r) => r.groupTitle))].filter(
    (title) => findGroupIdIgnoreCase(existingGroupIdByTitle, title) == null,
  )

  function findExisting(row: ParsedPastResultRow): OrienteeringParticipant | null {
    return (
      existingParticipants.find(
        (p) =>
          p.lastName.toLowerCase() === row.lastName.toLowerCase() &&
          p.firstName.toLowerCase() === row.firstName.toLowerCase() &&
          p.groupName?.toLowerCase() === row.groupTitle.toLowerCase(),
      ) ?? null
    )
  }

  return {
    groupsToCreate,
    existingGroupIdByTitle,
    rowPlans: parsedFile.rows.map((row) => ({ row, existingParticipant: findExisting(row) })),
    skippedRows: parsedFile.totalRowsInFile - parsedFile.rows.length,
    existingParticipants,
  }
}
