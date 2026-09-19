import { useState } from 'react'
import { groupRepository } from '../../api/groupRepository'
import { resultRepository } from '../../api/resultRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import { findGroupIdIgnoreCase, type PastResultsImportPlan, type PastResultsRowPlan } from '../../lib/pastResultsImportPlanner'
import type { OrienteeringCompetition } from '../../types/competition'
import type { OrienteeringResult, SaveParticipantRequest, SaveResultRequest } from '../../types/participant'

interface ImportPastResultsReviewDialogProps {
  competition: OrienteeringCompetition
  plan: PastResultsImportPlan
  existingResults: OrienteeringResult[]
  onDismiss: () => void
  onImported: () => void
}

/**
 * Превью перед импортом результатов прошедшего соревнования из Excel: показывает, какие группы
 * и участники будут созданы, а какие — только обновят результат. При подтверждении сохраняет
 * последовательно группы -> участников -> результаты (каждый следующий шаг зависит от id,
 * полученных на предыдущем).
 */
export function ImportPastResultsReviewDialog({ competition, plan, existingResults, onDismiss, onImported }: ImportPastResultsReviewDialogProps) {
  const [importing, setImporting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const newParticipantsCount = plan.rowPlans.filter((rp) => !rp.existingParticipant).length
  const updatedCount = plan.rowPlans.length - newParticipantsCount
  const rowsByGroup = groupByTitle(plan.rowPlans)

  async function runImport() {
    setImporting(true)
    setError(null)

    let createdGroupsByTitle = new Map<string, number>()
    if (plan.groupsToCreate.length > 0) {
      const requests = plan.groupsToCreate.map((title) => ({
        groupId: null,
        competitionId: competition.competitionId,
        title,
        gender: null,
        minAge: null,
        maxAge: null,
        distanceId: null,
        maxParticipants: null,
        timeLimitMinutes: null,
        scorePenaltyPerMinute: null,
        maxLatenessMinutes: null,
      }))
      const gr = await groupRepository.saveGroups(requests)
      if (gr.kind === 'error') {
        setError(`Группы: ${gr.message}`)
        setImporting(false)
        return
      }
      createdGroupsByTitle = new Map(plan.groupsToCreate.map((title, i) => [title, gr.data[i]?.groupId]).filter((e): e is [string, number] => e[1] != null))
    }

    function resolveGroupId(title: string): number {
      return findGroupIdIgnoreCase(plan.existingGroupIdByTitle, title) ?? findGroupIdIgnoreCase(createdGroupsByTitle, title) ?? 0
    }

    const competitionStart = competition.competition.startDate
    let nextStartNumber = Math.max(0, ...plan.existingParticipants.map((p) => Number(p.startNumber) || 0)) + 1

    const participantIds: (string | null)[] = plan.rowPlans.map((rp) => rp.existingParticipant?.id ?? null)

    const newIndexed = plan.rowPlans.map((rp, index) => ({ rp, index })).filter(({ rp }) => !rp.existingParticipant)
    if (newIndexed.length > 0) {
      const requests: SaveParticipantRequest[] = newIndexed.map(({ rp }) => ({
        id: crypto.randomUUID(),
        userId: null,
        firstName: rp.row.firstName,
        lastName: rp.row.lastName,
        groupId: resolveGroupId(rp.row.groupTitle),
        groupName: rp.row.groupTitle,
        competitionId: competition.competitionId,
        commandName: null,
        startNumber: nextStartNumber++,
        startTime: competitionStart + (rp.row.startOffsetSeconds ?? 0) * 1000,
        chipNumber: 0,
        comment: null,
        isChipGiven: false,
      }))
      const pr = await resultRepository.saveParticipants(requests)
      if (pr.kind === 'error') {
        setError(`Участники: ${pr.message}`)
        setImporting(false)
        return
      }
      newIndexed.forEach(({ index }, i) => {
        participantIds[index] = pr.data[i]?.id ?? null
      })
    }

    const existingResultByParticipantId = new Map(existingResults.map((r) => [r.participantId, r]))
    const resultRequests: SaveResultRequest[] = plan.rowPlans
      .map((rp, idx): SaveResultRequest | null => {
        const participantId = participantIds[idx]
        if (!participantId) return null
        const existingResult = existingResultByParticipantId.get(participantId)
        const startMillis = rp.row.startOffsetSeconds != null ? competitionStart + rp.row.startOffsetSeconds * 1000 : (existingResult?.startTime ?? null)
        const finishMillis = rp.row.finishOffsetSeconds != null ? competitionStart + rp.row.finishOffsetSeconds * 1000 : (existingResult?.finishTime ?? null)
        return {
          id: existingResult?.id ?? crypto.randomUUID(),
          competitionId: competition.competitionId,
          groupId: resolveGroupId(rp.row.groupTitle),
          participantId,
          startTime: startMillis,
          finishTime: finishMillis,
          totalTime: rp.row.totalTimeSeconds ?? existingResult?.totalTime ?? null,
          rank: rp.row.rank ?? existingResult?.rank ?? null,
          status: rp.row.status,
          penaltyTime: existingResult?.penaltyTime ?? 0,
          splits: existingResult?.splits ?? null,
          isEditable: existingResult?.isEditable ?? true,
          isEdited: true,
        }
      })
      .filter((r): r is SaveResultRequest => r != null)

    const rr = await resultRepository.saveResults(resultRequests)
    if (rr.kind === 'error') {
      setError(`Результаты: ${rr.message}`)
      setImporting(false)
      return
    }
    setImporting(false)
    setShowConfirm(false)
    analytics.trackEvent(AnalyticsEvents.participantAdded('import'))
    onImported()
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={onDismiss} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">Импорт результатов: {competition.competition.title}</h1>
      </header>

      <div className="flex flex-col gap-1 px-4 py-3">
        <p className="text-base text-fg">
          Новых групп: {plan.groupsToCreate.length} • Новых участников: {newParticipantsCount} • Обновится: {updatedCount}
        </p>
        {plan.skippedRows > 0 && <p className="text-sm text-on-surface-variant">Не распознано и пропущено строк: {plan.skippedRows}</p>}
        {error && <ErrorMessage message={error} />}
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {plan.rowPlans.length === 0 && <p className="pt-4 text-on-surface-variant">Нет данных для импорта</p>}
        {rowsByGroup.map(([groupTitle, rows]) => {
          const isNewGroup = plan.groupsToCreate.some((g) => g.toLowerCase() === groupTitle.toLowerCase())
          return (
            <div key={groupTitle}>
              <div className="flex items-center gap-2 pt-3 pb-1">
                <h3 className="text-sm font-medium text-fg">{groupTitle}</h3>
                {isNewGroup && <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs text-on-primary-container">новая группа</span>}
              </div>
              <hr className="border-outline-variant" />
              {rows.map((rp, i) => (
                <PastResultRow key={i} rowPlan={rp} />
              ))}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-outline-variant p-3">
        <button type="button" onClick={onDismiss} disabled={importing} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50">
          Отмена
        </button>
        <button
          type="button"
          disabled={plan.rowPlans.length === 0 || importing}
          onClick={() => setShowConfirm(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
        >
          Импортировать ({plan.rowPlans.length})
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Импортировать результаты?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Будут созданы {plan.groupsToCreate.length} групп(ы), {newParticipantsCount} участник(ов) и сохранены результаты для {plan.rowPlans.length} строк.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={importing} onClick={() => setShowConfirm(false)} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50">
                Отмена
              </button>
              <button type="button" disabled={importing} onClick={runImport} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50">
                {importing ? 'Импорт…' : 'Импортировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function groupByTitle(rowPlans: PastResultsRowPlan[]): [string, PastResultsRowPlan[]][] {
  const byGroup = new Map<string, PastResultsRowPlan[]>()
  for (const rp of rowPlans) {
    const list = byGroup.get(rp.row.groupTitle) ?? []
    list.push(rp)
    byGroup.set(rp.row.groupTitle, list)
  }
  return [...byGroup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, rows]) => [title, [...rows].sort((a, b) => (a.row.rank ?? Infinity) - (b.row.rank ?? Infinity))])
}

function PastResultRow({ rowPlan }: { rowPlan: PastResultsRowPlan }) {
  const { row, existingParticipant } = rowPlan
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-8 text-sm text-fg">{row.rank ?? '—'}</span>
      <div className="flex-1">
        <div className="text-fg">{`${row.lastName} ${row.firstName}`.trim()}</div>
        {!existingParticipant && <div className="text-xs text-on-surface-variant">новый участник</div>}
      </div>
      <span className="w-16 text-fg">{row.status === 'FINISHED' && row.totalTimeSeconds != null ? formatDuration(row.totalTimeSeconds) : row.status}</span>
    </div>
  )
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
