import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { participantLinkRepository } from '../../api/participantLinkRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import type { LinkCandidate } from '../../types/participantLink'
import type { OrienteeringParticipant } from '../../types/participant'
import { invalidateLinkQueries } from './hooks'

interface LinkToAccountDialogProps {
  participant: OrienteeringParticipant
  onDismiss: () => void
  onLinked: () => void
}

/**
 * Организатор сам привязывает вручную внесённого участника к аккаунту — когда человек
 * зарегистрировался, но заявку на свой старый результат не подал. Поиск по фамилии.
 */
export function LinkToAccountDialog({ participant, onDismiss, onLinked }: LinkToAccountDialogProps) {
  const queryClient = useQueryClient()
  const [queryInput, setQueryInput] = useState(participant.lastName)
  const [appliedQuery, setAppliedQuery] = useState('')
  const [selected, setSelected] = useState<LinkCandidate | null>(null)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = useQuery({
    queryKey: ['link-candidates', participant.id, appliedQuery],
    queryFn: async () => {
      const result = await participantLinkRepository.getLinkCandidates(participant.id, appliedQuery)
      if (result.kind === 'error') throw new Error(result.message)
      return result.data
    },
  })

  async function handleLink() {
    if (!selected) return
    setLinking(true)
    setError(null)
    const result = await participantLinkRepository.linkParticipants(selected.userId, [participant.id])
    setLinking(false)
    if (result.kind === 'error') {
      setError(result.message)
      return
    }
    await invalidateLinkQueries(queryClient, participant.competitionId)
    onLinked()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-fg">Привязать к аккаунту</h3>
        <p className="text-sm text-on-surface-variant">
          {participant.lastName} {participant.firstName}
          {participant.groupName ? ` · ${participant.groupName}` : ''}. Результат появится в профиле человека, ему
          придёт уведомление — при ошибке он сможет отвязать результат сам.
        </p>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSelected(null)
            setAppliedQuery(queryInput)
          }}
        >
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Фамилия"
            className="min-w-0 flex-1 rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
          <button type="submit" className="rounded-md border border-outline px-3 py-2 text-sm text-fg">
            Найти
          </button>
        </form>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {candidates.isLoading ? (
            <Loading />
          ) : candidates.isError ? (
            <ErrorMessage message={(candidates.error as Error).message} />
          ) : !candidates.data || candidates.data.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Никого не нашли. Человек должен быть зарегистрирован в Competra — попробуйте другое написание фамилии.
            </p>
          ) : (
            candidates.data.map((c) => {
              const isSelected = selected?.userId === c.userId
              return (
                <button
                  key={c.userId}
                  type="button"
                  disabled={c.alreadyInCompetition}
                  onClick={() => setSelected(c)}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left disabled:opacity-50 ${
                    isSelected ? 'border-primary bg-primary/10' : 'border-outline-variant'
                  }`}
                >
                  <span className="text-fg">
                    {c.lastName} {c.firstName} {c.middleName ?? ''}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {c.birthYear ? `${c.birthYear} г. р.` : 'Год рождения не указан'}
                    {c.nameMatches ? ' · имя совпадает с протоколом' : ''}
                  </span>
                  {c.alreadyInCompetition && (
                    <span className="text-xs text-error">Уже есть в протоколе этого соревнования</span>
                  )}
                  {!c.alreadyInCompetition && c.eligibilityWarning && (
                    <span className="text-xs text-error">{c.eligibilityWarning}</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {error && <ErrorMessage message={error} />}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!selected || linking}
            onClick={handleLink}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {linking ? 'Привязываем…' : 'Привязать'}
          </button>
        </div>
      </div>
    </div>
  )
}
