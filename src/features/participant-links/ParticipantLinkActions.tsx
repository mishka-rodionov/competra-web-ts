import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { participantLinkRepository } from '../../api/participantLinkRepository'
import { useIsLoggedIn } from '../../auth/useIsLoggedIn'
import { ErrorMessage } from '../../components/ErrorMessage'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import type { OrienteeringParticipant } from '../../types/participant'
import { useUserProfile } from '../profile/hooks'
import { invalidateLinkQueries, useMyLinkRequests } from './hooks'
import { LinkRequestDialog } from './LinkRequestDialog'

interface ParticipantLinkActionsProps {
  participant: OrienteeringParticipant
  /** Все участники соревнования — чтобы не предлагать привязку тому, кто уже есть в протоколе. */
  participants: OrienteeringParticipant[]
  /** «Семенов Петр · М21 · 5 место» — для диалога подтверждения. */
  label: string
}

/**
 * Ручной вход в привязку: для случаев, когда организатор записал человека иначе, чем в профиле,
 * и подсказка по имени не сработала. Для своего результата — отвязка.
 */
export function ParticipantLinkActions({ participant, participants, label }: ParticipantLinkActionsProps) {
  const queryClient = useQueryClient()
  const isLoggedIn = useIsLoggedIn()
  const { data: profile } = useUserProfile()
  const { data: requests } = useMyLinkRequests()
  const [confirmingLink, setConfirmingLink] = useState(false)
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isLoggedIn || !profile || !requests) return null

  const competitionId = participant.competitionId

  async function handleUnlink() {
    setUnlinking(true)
    setError(null)
    const result = await participantLinkRepository.unlinkParticipant(participant.id)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.resultUnlinked(competitionId, 'self'))
      await invalidateLinkQueries(queryClient, competitionId)
      setConfirmingUnlink(false)
    } else {
      setError(result.message)
    }
    setUnlinking(false)
  }

  if (participant.userId === profile.id) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-primary bg-primary/10 p-3">
        <span className="text-sm text-fg">Это ваш результат — он привязан к вашему профилю</span>
        {confirmingUnlink ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-fg">Отвязать результат от профиля?</span>
            <button type="button" disabled={unlinking} onClick={handleUnlink} className="text-sm text-error disabled:opacity-50">
              {unlinking ? 'Отвязываем…' : 'Отвязать'}
            </button>
            <button type="button" disabled={unlinking} onClick={() => setConfirmingUnlink(false)} className="text-sm text-fg">
              Отмена
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingUnlink(true)} className="self-start text-sm text-on-surface-variant underline">
            Это не мой результат — отвязать
          </button>
        )}
        {error && <ErrorMessage message={error} />}
      </div>
    )
  }

  // Привязан к кому-то другому, или пользователь уже есть в протоколе этого соревнования.
  if (participant.userId) return null
  if (participants.some((p) => p.userId === profile.id)) return null

  const pendingHere = requests.find((r) => r.competitionId === competitionId && r.status === 'PENDING')
  if (pendingHere) {
    return pendingHere.participantId === participant.id ? (
      <div className="rounded-lg border border-outline-variant bg-surface-variant/40 p-3 text-sm text-on-surface-variant">
        Заявка на привязку этого результата к вашему профилю на рассмотрении у организатора
      </div>
    ) : null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmingLink(true)}
        className="self-start rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
      >
        Это мой результат
      </button>
      {confirmingLink && (
        <LinkRequestDialog
          candidates={[{ participantId: participant.id, competitionId, label }]}
          source="MANUAL"
          onDismiss={() => setConfirmingLink(false)}
          onSent={() => setConfirmingLink(false)}
        />
      )}
    </>
  )
}
