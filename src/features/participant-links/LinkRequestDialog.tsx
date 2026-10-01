import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { participantLinkRepository } from '../../api/participantLinkRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import type { LinkRequestSource } from '../../types/participantLink'
import { invalidateLinkQueries } from './hooks'

export interface LinkCandidate {
  participantId: string
  competitionId: string
  /** Одна строка описания: «Кубок 1 · Семенов Петр · М21 · 5 место». */
  label: string
}

interface LinkRequestDialogProps {
  candidates: LinkCandidate[]
  source: LinkRequestSource
  onDismiss: () => void
  onSent: () => void
}

/** Подтверждение перед отправкой заявки на привязку: организатор проверит, отмечать только свои. */
export function LinkRequestDialog({ candidates, source, onDismiss, onSent }: LinkRequestDialogProps) {
  const queryClient = useQueryClient()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setSending(true)
    setError(null)
    const result = await participantLinkRepository.createRequests(
      candidates.map((c) => c.participantId),
      source,
    )
    if (result.kind === 'error') {
      setError(result.message)
      setSending(false)
      return
    }
    const countByCompetition = new Map<string, number>()
    for (const c of candidates) countByCompetition.set(c.competitionId, (countByCompetition.get(c.competitionId) ?? 0) + 1)
    const analyticsSource = source === 'SUGGESTION' ? 'suggestion' : 'manual'
    for (const [competitionId, count] of countByCompetition) {
      analytics.trackEvent(AnalyticsEvents.resultLinkRequested(competitionId, analyticsSource, count))
    }
    // Организатор, заявивший свой же результат, получает автоодобрение — участник меняется сразу.
    await Promise.all(
      [...countByCompetition.keys()].map((competitionId) => invalidateLinkQueries(queryClient, competitionId)),
    )
    onSent()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">
          {candidates.length === 1 ? 'Привязать результат к профилю?' : `Привязать результаты (${candidates.length}) к профилю?`}
        </h3>
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-sm text-fg">
          {candidates.map((c) => (
            <li key={c.participantId}>{c.label}</li>
          ))}
        </ul>
        <p className="text-sm text-on-surface-variant">
          Организатор соревнования проверит заявку. Отмечайте только свои результаты.
        </p>
        {error && <ErrorMessage message={error} />}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={sending}
            className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {sending ? 'Отправка…' : 'Отправить заявку'}
          </button>
        </div>
      </div>
    </div>
  )
}
