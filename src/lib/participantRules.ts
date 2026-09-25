import type { OrienteeringParticipant, OrienteeringResult, SaveResultRequest } from '../types/participant'

/**
 * Статусы соревнования, после которых участника нельзя удалить: к нему уже привязаны стартовое
 * время, чип и результат, а удаление сдвигает места в протоколе. Неявку отмечают статусом DNS.
 * Та же проверка — в Android (`isParticipantDeletionLocked`) и на бэкенде (HTTP 422).
 */
const DELETION_LOCKED_STATUSES = new Set(['IN_PROGRESS', 'FINISHED', 'ARCHIVED'])

export function isParticipantDeletionLocked(competitionStatus: string): boolean {
  return DELETION_LOCKED_STATUSES.has(competitionStatus)
}

/**
 * Можно ли вручную поставить «Не стартовал» участнику с таким статусом результата
 * (undefined — результата ещё нет). Участник со стартом/финишем/снятием уже стартовал.
 * DNF допускается: при завершении соревнования его получают все участники без результата.
 */
export function canBeMarkedDns(resultStatus: string | undefined): boolean {
  return resultStatus === undefined || resultStatus === 'REGISTERED' || resultStatus === 'DNF'
}

/**
 * Запрос на сохранение результата, ставящий (isDns) или снимающий отметку «Не стартовал».
 * При снятии статус возвращается в DNF, если соревнование завершено, иначе — в REGISTERED
 * (как в Android).
 */
export function buildDnsResultRequest(
  participant: OrienteeringParticipant,
  existing: OrienteeringResult | undefined,
  isDns: boolean,
  competitionStatus: string,
): SaveResultRequest {
  const isFinished = competitionStatus === 'FINISHED' || competitionStatus === 'ARCHIVED'
  const status = isDns ? 'DNS' : isFinished ? 'DNF' : 'REGISTERED'
  return {
    id: existing?.id ?? crypto.randomUUID(),
    competitionId: participant.competitionId,
    groupId: existing?.groupId ?? participant.groupId,
    participantId: participant.id,
    startTime: existing?.startTime ?? null,
    finishTime: isDns ? null : (existing?.finishTime ?? null),
    totalTime: isDns ? null : (existing?.totalTime ?? null),
    rank: isDns ? null : (existing?.rank ?? null),
    status,
    penaltyTime: existing?.penaltyTime ?? 0,
    splits: existing?.splits ?? null,
    isEditable: existing?.isEditable ?? true,
    isEdited: true,
  }
}
