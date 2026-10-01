import { formatTime } from '../../lib/dateUtils'
import type { LinkRequestStatus, LinkResultSummary } from '../../types/participantLink'
import { resultStatusLabel } from '../competitions/labels'

export function linkRequestStatusLabel(status: LinkRequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'На рассмотрении'
    case 'APPROVED':
      return 'Привязан'
    case 'REJECTED':
      return 'Отклонена'
    case 'CANCELLED':
      return 'Отозвана'
    case 'UNLINKED':
      return 'Отвязан'
  }
}

export function linkRequestStatusColorClass(status: LinkRequestStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'text-primary'
    case 'REJECTED':
      return 'text-error'
    default:
      return 'text-on-surface-variant'
  }
}

/** «5 место · 45:12», «120 оч. · 58:30» или статус схода — чтобы человек узнал свой старт. */
export function linkResultLabel(result: LinkResultSummary | null | undefined): string | null {
  if (!result) return null
  if (result.status !== 'FINISHED') return resultStatusLabel(result.status)
  const parts: string[] = []
  if (result.rank != null && result.rank > 0) parts.push(`${result.rank} место`)
  if (result.totalScore != null) parts.push(`${result.totalScore} оч.`)
  if (result.totalTime != null) parts.push(formatTime(result.totalTime))
  return parts.length > 0 ? parts.join(' · ') : resultStatusLabel(result.status)
}
