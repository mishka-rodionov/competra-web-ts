import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { participantLinkRepository } from '../api/participantLinkRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { AuthFlow } from '../features/auth/AuthFlow'
import { invalidateLinkQueries, useLinkSuggestions, useMyLinkRequests } from '../features/participant-links/hooks'
import { linkRequestStatusColorClass, linkRequestStatusLabel, linkResultLabel } from '../features/participant-links/labels'
import { LinkRequestDialog, type LinkCandidate } from '../features/participant-links/LinkRequestDialog'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'
import { toLocaleDateString } from '../lib/dateUtils'
import type { LinkRequest, LinkSuggestion } from '../types/participantLink'

function suggestionDetails(s: LinkSuggestion): string {
  return [`${s.lastName} ${s.firstName}`.trim(), s.groupName, s.commandName, linkResultLabel(s.result)]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Результаты, которые организатор внёс вручную (без привязки к аккаунту): подсказки по имени
 * из профиля + заявки пользователя на привязку и их статусы.
 */
export function ResultLinksPage() {
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()
  const { data: suggestions, isLoading: suggestionsLoading, isError, error } = useLinkSuggestions()
  const { data: requests, isLoading: requestsLoading } = useMyLinkRequests()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const viewTracked = useRef(false)
  useEffect(() => {
    if (suggestions && !viewTracked.current) {
      viewTracked.current = true
      analytics.trackEvent(AnalyticsEvents.resultLinkSuggestionsViewed(suggestions.length))
    }
  }, [suggestions])

  if (!isLoggedIn) {
    return <AuthFlow onLoginSuccess={() => {}} />
  }

  const list = suggestions ?? []
  // Подсказки могли обновиться (заявка ушла) — выбранными считаем только те, что ещё в списке.
  const selected = list.filter((s) => selectedIds.has(s.participantId))
  const allSelected = list.length > 0 && selected.length === list.length

  function toggle(participantId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(participantId)) next.delete(participantId)
      else next.add(participantId)
      return next
    })
  }

  const candidates: LinkCandidate[] = selected.map((s) => ({
    participantId: s.participantId,
    competitionId: s.competitionId,
    label: `${s.competitionTitle} · ${suggestionDetails(s)}`,
  }))

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Мои результаты в протоколах</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-on-surface-variant">
          Если организатор внёс вас в протокол вручную, результат не попадает в ваш профиль и рейтинги. Найдите такие
          результаты и отправьте заявку — организатор соревнования её проверит.
        </p>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-medium text-fg">Похожие на ваши</h2>
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedIds(allSelected ? new Set() : new Set(list.map((s) => s.participantId)))}
                className="text-sm text-primary"
              >
                {allSelected ? 'Снять все' : 'Выбрать все'}
              </button>
            )}
          </div>
          {suggestionsLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorMessage message={(error as Error).message} />
          ) : list.length === 0 ? (
            <p className="rounded-lg border border-outline-variant bg-surface p-4 text-sm text-on-surface-variant">
              Результатов с вашими фамилией и именем не найдено. Если организатор записал вас иначе, откройте свой
              результат в протоколе соревнования и нажмите «Это мой результат».
            </p>
          ) : (
            <>
              {list.map((s) => (
                <label
                  key={s.participantId}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant bg-surface p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.participantId)}
                    onChange={() => toggle(s.participantId)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-fg">{s.competitionTitle}</span>
                    <span className="text-sm text-on-surface-variant">{toLocaleDateString(s.competitionStartDate)}</span>
                    <span className="text-sm text-fg">{suggestionDetails(s)}</span>
                  </span>
                </label>
              ))}
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => setConfirming(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
              >
                {selected.length > 0 ? `Отправить заявку (${selected.length})` : 'Отметьте свои результаты'}
              </button>
            </>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-fg">Мои заявки</h2>
          {requestsLoading ? (
            <Loading />
          ) : !requests || requests.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Вы ещё не подавали заявок</p>
          ) : (
            requests.map((request) => <MyLinkRequestRow key={request.id} request={request} />)
          )}
        </section>
      </div>

      {confirming && (
        <LinkRequestDialog
          candidates={candidates}
          source="SUGGESTION"
          onDismiss={() => setConfirming(false)}
          onSent={() => {
            setConfirming(false)
            setSelectedIds(new Set())
          }}
        />
      )}
    </div>
  )
}

function MyLinkRequestRow({ request }: { request: LinkRequest }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setCancelling(true)
    setError(null)
    const result = await participantLinkRepository.cancelRequest(request.id)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.resultLinkRequestCancelled(request.competitionId))
      await invalidateLinkQueries(queryClient, request.competitionId)
    } else {
      setError(result.message)
    }
    setCancelling(false)
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/competition/${request.competitionId}`)}
          className="flex flex-col gap-0.5 text-left"
        >
          <span className="text-sm font-medium text-fg">{request.competitionTitle}</span>
          <span className="text-sm text-on-surface-variant">
            {toLocaleDateString(request.competitionStartDate)} ·{' '}
            {`${request.participantLastName} ${request.participantFirstName}`.trim()} · {request.groupName}
          </span>
        </button>
        <span className={`shrink-0 text-sm font-medium ${linkRequestStatusColorClass(request.status)}`}>
          {linkRequestStatusLabel(request.status)}
        </span>
      </div>
      {request.status === 'REJECTED' && request.comment && (
        <span className="text-sm text-on-surface-variant">Комментарий организатора: {request.comment}</span>
      )}
      {request.status === 'PENDING' && (
        <button
          type="button"
          disabled={cancelling}
          onClick={handleCancel}
          className="self-start text-sm text-error disabled:opacity-50"
        >
          {cancelling ? 'Отзываем…' : 'Отозвать заявку'}
        </button>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  )
}
