import { useState } from 'react'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'
import { useLinkSuggestions, useMyLinkRequests } from './hooks'
import { linkResultLabel } from './labels'
import { LinkRequestDialog } from './LinkRequestDialog'

/**
 * Над протоколом: «похоже, здесь есть ваш результат» (подсказка по имени), либо статус уже
 * поданной заявки. Незалогиненным и тем, у кого ничего не нашлось, не показывается.
 */
export function LinkSuggestionBanner({ competitionId }: { competitionId: string }) {
  const isLoggedIn = useIsLoggedIn()
  const { data: suggestions } = useLinkSuggestions()
  const { data: requests } = useMyLinkRequests()
  const [confirming, setConfirming] = useState(false)

  if (!isLoggedIn) return null

  const pending = requests?.find((r) => r.competitionId === competitionId && r.status === 'PENDING')
  if (pending) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-variant/40 p-3 text-sm text-on-surface-variant">
        Заявка на привязку результата «{`${pending.participantLastName} ${pending.participantFirstName}`.trim()}» к вашему
        профилю на рассмотрении у организатора
      </div>
    )
  }

  // Бэкенд не предлагает участников соревнований, где пользователь уже есть в протоколе,
  // поэтому подсказка здесь — максимум одна по смыслу; берём первую.
  const suggestion = suggestions?.find((s) => s.competitionId === competitionId)
  if (!suggestion) return null

  const details = [`${suggestion.lastName} ${suggestion.firstName}`.trim(), suggestion.groupName, linkResultLabel(suggestion.result)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary bg-primary/10 p-3">
      <span className="text-sm text-fg">
        Похоже, здесь есть ваш результат: <span className="font-medium">{details}</span>
      </span>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary"
      >
        Это я
      </button>
      {confirming && (
        <LinkRequestDialog
          candidates={[{ participantId: suggestion.participantId, competitionId, label: details }]}
          source="SUGGESTION"
          onDismiss={() => setConfirming(false)}
          onSent={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
