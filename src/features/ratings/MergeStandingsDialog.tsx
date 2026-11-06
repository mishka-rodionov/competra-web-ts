import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ratingRepository } from '../../api/ratingRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { RatingStanding } from '../../types/rating'
import { startsCountLabel } from './labels'

interface MergeStandingsDialogProps {
  ratingId: string
  ratingGroupId: number
  entries: RatingStanding[]
  onDismiss: () => void
  onMerged: () => void
}

/** Основная запись по умолчанию: с аккаунтом, иначе с самым полным именем. */
function defaultTarget(entries: RatingStanding[]): RatingStanding {
  return (
    entries.find((e) => e.userId) ??
    [...entries].sort((a, b) => b.firstName.length - a.firstName.length || b.breakdown.length - a.breakdown.length)[0]
  )
}

/** Почему выбранную основную запись нельзя объединить с остальными; null — можно. */
function mergeProblem(target: RatingStanding, sources: RatingStanding[]): string | null {
  if (sources.length === 0) return 'Выберите хотя бы две строки'
  if (target.userId && sources.some((s) => s.userId)) return 'Нельзя объединить два аккаунта'
  if (!target.userId && sources.some((s) => s.userId)) return 'Основной выберите строку с аккаунтом — к ней привяжутся остальные'
  return null
}

/**
 * Объединение дублей таблицы рейтинга. Основная строка с аккаунтом — результаты остальных
 * привязываются к нему; без аккаунта — остальные переименовываются в её ФИО в протоколах.
 */
export function MergeStandingsDialog({ ratingId, ratingGroupId, entries, onDismiss, onMerged }: MergeStandingsDialogProps) {
  const queryClient = useQueryClient()
  const [targetKey, setTargetKey] = useState(() => defaultTarget(entries).participantKey)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = entries.find((e) => e.participantKey === targetKey) ?? entries[0]
  const sources = entries.filter((e) => e.participantKey !== target.participantKey)
  const problem = mergeProblem(target, sources)

  async function handleMerge() {
    setMerging(true)
    setError(null)
    const result = await ratingRepository.mergeStandings(ratingId, {
      ratingGroupId,
      targetKey: target.participantKey,
      sourceKeys: sources.map((s) => s.participantKey),
    })
    setMerging(false)
    if (result.kind === 'error') {
      setError(result.message)
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rating-standings', ratingId] }),
      queryClient.invalidateQueries({ queryKey: ['participants'] }),
    ])
    onMerged()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-fg">Объединить записи</h3>
        <p className="text-sm text-on-surface-variant">Выберите основную запись — остальные станут ею.</p>

        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {entries.map((e) => (
            <label
              key={e.participantKey}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                e.participantKey === target.participantKey ? 'border-primary bg-primary/10' : 'border-outline-variant'
              }`}
            >
              <input
                type="radio"
                name="merge-target"
                checked={e.participantKey === target.participantKey}
                onChange={() => setTargetKey(e.participantKey)}
                className="mt-1"
              />
              <span className="flex flex-col">
                <span className="text-fg">
                  {e.lastName} {e.firstName}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {e.userId ? 'Аккаунт Competra' : 'Без аккаунта'} · {e.breakdown.length}{' '}
                  {startsCountLabel(e.breakdown.length)} · {e.totalPoints} очков
                </span>
              </span>
            </label>
          ))}
        </div>

        {problem ? (
          <p className="text-sm text-error">{problem}</p>
        ) : (
          <p className="text-sm text-on-surface-variant">
            {target.userId
              ? `Результаты остальных записей привяжутся к аккаунту «${target.lastName} ${target.firstName}». Человеку придёт уведомление — при ошибке он сможет отвязать результат сам.`
              : `В протоколах соревнований остальные записи переименуются в «${target.lastName} ${target.firstName}».`}
          </p>
        )}

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
            disabled={problem != null || merging}
            onClick={handleMerge}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {merging ? 'Объединяем…' : 'Объединить'}
          </button>
        </div>
      </div>
    </div>
  )
}
