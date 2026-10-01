import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { participantLinkRepository } from '../../api/participantLinkRepository'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import type { CompetitionLinkRequest } from '../../types/participantLink'
import { invalidateLinkQueries, useCompetitionLinkRequests } from '../participant-links/hooks'
import { linkRequestStatusColorClass, linkRequestStatusLabel, linkResultLabel } from '../participant-links/labels'

function applicantName(r: CompetitionLinkRequest) {
  return `${r.userLastName} ${r.userFirstName}`.trim() || 'Пользователь без имени'
}

function applicantMeta(r: CompetitionLinkRequest) {
  const gender = r.userGender === 'male' ? 'муж.' : r.userGender === 'female' ? 'жен.' : null
  return [r.userBirthYear ? `${r.userBirthYear} г.р.` : null, gender].filter(Boolean).join(' · ')
}

function participantDetails(r: CompetitionLinkRequest) {
  return [
    `${r.participantLastName} ${r.participantFirstName}`.trim(),
    r.groupName,
    r.startNumber > 0 ? `№${r.startNumber}` : null,
    r.commandName,
    linkResultLabel(r.result),
  ]
    .filter(Boolean)
    .join(' · ')
}

function warningsOf(r: CompetitionLinkRequest): string[] {
  const warnings: string[] = []
  if (r.userAlreadyInCompetition) {
    warnings.push('Заявитель уже есть в протоколе этого соревнования. Удалите лишнюю запись на вкладке «Участники», затем одобрите заявку')
  }
  if (!r.nameMatches) warnings.push('Имя в протоколе отличается от имени в профиле заявителя')
  if (r.eligibilityWarning) warnings.push(r.eligibilityWarning)
  if (r.competingRequests > 0) {
    warnings.push(`На этот результат есть ещё заявки от других пользователей: ${r.competingRequests}`)
  }
  return warnings
}

/**
 * Заявки спортсменов «этот участник протокола — я». Одобрение записывает аккаунт в участника:
 * результат попадает в профиль спортсмена и склеивается с его стартами в рейтингах.
 */
export function LinkRequestsTab({ competitionId }: { competitionId: string }) {
  const { data: requests, isLoading, isError, error } = useCompetitionLinkRequests(competitionId)

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />

  const pending = (requests ?? []).filter((r) => r.status === 'PENDING')
  const processed = (requests ?? []).filter((r) => r.status !== 'PENDING')

  // Заявки одного человека — одной карточкой: организатор проверяет человека, а не строку.
  const byApplicant = new Map<string, CompetitionLinkRequest[]>()
  for (const r of pending) byApplicant.set(r.userId, [...(byApplicant.get(r.userId) ?? []), r])

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-on-surface-variant">
        Спортсмены, которых вы внесли вручную, просят привязать результаты к своим профилям. После одобрения результат
        появится в профиле спортсмена и в рейтингах будет засчитан ему.
      </p>

      {pending.length === 0 ? (
        <EmptyState text="Новых заявок нет" />
      ) : (
        [...byApplicant.values()].map((group) => <ApplicantCard key={group[0].userId} competitionId={competitionId} requests={group} />)
      )}

      {processed.length > 0 && (
        <details className="rounded-lg border border-outline-variant bg-surface p-3">
          <summary className="cursor-pointer text-sm text-fg">Обработанные ({processed.length})</summary>
          <div className="mt-2 flex flex-col gap-2">
            {processed.map((r) => (
              <div key={r.id} className="flex flex-col gap-0.5 border-t border-outline-variant pt-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-fg">{applicantName(r)}</span>
                  <span className={`shrink-0 font-medium ${linkRequestStatusColorClass(r.status)}`}>
                    {linkRequestStatusLabel(r.status)}
                  </span>
                </div>
                <span className="text-on-surface-variant">{participantDetails(r)}</span>
                {r.comment && <span className="text-on-surface-variant">Комментарий: {r.comment}</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function ApplicantCard({ competitionId, requests }: { competitionId: string; requests: CompetitionLinkRequest[] }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  const first = requests[0]
  const meta = applicantMeta(first)
  const approvable = requests.filter((r) => !r.userAlreadyInCompetition)

  async function review(targets: CompetitionLinkRequest[], approve: boolean, comment: string | null) {
    setBusy(true)
    setErrors({})
    const nextErrors: Record<string, string> = {}
    // Последовательно: одобрение одного участника может автоматически отклонить конкурирующую заявку.
    for (const r of targets) {
      const result = await participantLinkRepository.reviewRequest(r.id, approve, comment)
      if (result.kind === 'success') {
        analytics.trackEvent(AnalyticsEvents.resultLinkRequestReviewed(competitionId, approve))
      } else {
        nextErrors[r.id] = result.message
      }
    }
    setErrors(nextErrors)
    setRejectingId(null)
    setRejectComment('')
    await invalidateLinkQueries(queryClient, competitionId)
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex flex-col">
        <span className="text-base font-medium text-fg">{applicantName(first)}</span>
        {meta && <span className="text-sm text-on-surface-variant">{meta}</span>}
      </div>

      {requests.map((r) => {
        const warnings = warningsOf(r)
        return (
          <div key={r.id} className="flex flex-col gap-2 border-t border-outline-variant pt-3">
            <span className="text-sm text-fg">
              <span className="text-on-surface-variant">Результат: </span>
              {participantDetails(r)}
            </span>
            <span className="text-xs text-on-surface-variant">
              {r.source === 'SUGGESTION' ? 'Нашёл по совпадению имени' : 'Выбрал результат в протоколе сам'}
            </span>
            {warnings.map((w) => (
              <span key={w} className="rounded-md bg-error/10 px-2 py-1 text-xs text-error">
                {w}
              </span>
            ))}
            {rejectingId === r.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Причина (необязательно) — спортсмен её увидит"
                  maxLength={500}
                  rows={2}
                  className="rounded-md border border-outline bg-bg px-3 py-2 text-sm text-fg"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRejectingId(null)}
                    className="flex-1 rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review([r], false, rejectComment.trim() || null)}
                    className="flex-1 rounded-md bg-error px-3 py-1.5 text-sm text-on-error disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRejectComment('')
                    setRejectingId(r.id)
                  }}
                  className="flex-1 rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50"
                >
                  Отклонить
                </button>
                <button
                  type="button"
                  disabled={busy || r.userAlreadyInCompetition}
                  onClick={() => review([r], true, null)}
                  className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
                >
                  Одобрить
                </button>
              </div>
            )}
            {errors[r.id] && <ErrorMessage message={errors[r.id]} />}
          </div>
        )
      })}

      {approvable.length > 1 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => review(approvable, true, null)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
        >
          Одобрить все ({approvable.length})
        </button>
      )}
    </div>
  )
}
