import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { resultRepository } from '../../api/resultRepository'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { TabBar } from '../../components/TabBar'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import { buildDnsResultRequest, canBeMarkedDns, isParticipantDeletionLocked } from '../../lib/participantRules'
import type { OrienteeringCompetition } from '../../types/competition'
import type { OrienteeringParticipant } from '../../types/participant'
import { useParticipants, useResults } from '../competition-detail/hooks'
import { useGroups } from './hooks'
import { ParticipantEditorDialog } from './ParticipantEditorDialog'

const ALL_TAB = 'all'

/** null/нечисловое значение сортируется в конец — но startNumber "0" (валидный номер) не должен попасть сюда: Number("0") ложно в JS, поэтому нельзя сравнивать через `||`. */
function sortableStartNumber(startNumber: string | null): number {
  if (startNumber == null) return Infinity
  const parsed = Number(startNumber)
  return Number.isNaN(parsed) ? Infinity : parsed
}

export function ParticipantsManageTab({ competition }: { competition: OrienteeringCompetition }) {
  const competitionId = competition.competitionId
  const queryClient = useQueryClient()
  const { data: groups, isLoading: groupsLoading, isError: groupsError, error: groupsErr } = useGroups(competitionId)
  const { data: participants, isLoading: participantsLoading, isError, error } = useParticipants(competitionId)
  const [selectedTab, setSelectedTab] = useState(ALL_TAB)
  // undefined — диалог закрыт, null — новый участник, объект — редактирование существующего.
  const [editingParticipant, setEditingParticipant] = useState<OrienteeringParticipant | null | undefined>(undefined)
  const [deletingParticipant, setDeletingParticipant] = useState<OrienteeringParticipant | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dnsSavingId, setDnsSavingId] = useState<string | null>(null)

  const competitionStatus = competition.competition.status
  // После старта участников не удаляют — вместо удаления доступна отметка «Не стартовал»
  const isDeletionLocked = isParticipantDeletionLocked(competitionStatus)
  const { data: results } = useResults(competitionId, competitionStatus)
  const resultByParticipant = new Map((results ?? []).map((r) => [r.participantId, r]))

  const isLoading = groupsLoading || participantsLoading
  const hasAllTab = (groups?.length ?? 0) > 1
  const tabs = [
    ...(hasAllTab ? [{ key: ALL_TAB, label: 'Все' }] : []),
    ...(groups ?? []).map((g) => ({ key: String(g.groupId), label: g.title })),
  ]
  const effectiveTab = tabs.some((t) => t.key === selectedTab) ? selectedTab : (tabs[0]?.key ?? ALL_TAB)

  const visibleParticipants = [...(participants ?? [])]
    .filter((p) => effectiveTab === ALL_TAB || p.groupId === Number(effectiveTab))
    .sort((a, b) => {
      const startDiff = (a.startTime ?? Infinity) - (b.startTime ?? Infinity)
      if (startDiff !== 0) return startDiff
      return sortableStartNumber(a.startNumber) - sortableStartNumber(b.startNumber)
    })

  async function handleDelete() {
    if (!deletingParticipant) return
    const result = await resultRepository.deleteParticipant(deletingParticipant.id)
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['participants', competitionId] })
      setDeletingParticipant(null)
    } else {
      // Сервер отвечает 422 с понятным текстом, если соревнование уже стартовало
      setDeletingParticipant(null)
      setDeleteError(result.code === 422 ? result.message : 'Не удалось удалить участника')
    }
  }

  async function handleToggleDns(participant: OrienteeringParticipant, isDns: boolean) {
    setDeleteError(null)
    setDnsSavingId(participant.id)
    const request = buildDnsResultRequest(participant, resultByParticipant.get(participant.id), isDns, competitionStatus)
    const result = await resultRepository.saveResults([request])
    setDnsSavingId(null)
    if (result.kind === 'success') {
      if (isDns) analytics.trackEvent(AnalyticsEvents.participantDnsMarked(competitionId))
      await queryClient.invalidateQueries({ queryKey: ['results', competitionId] })
    } else {
      setDeleteError('Не удалось сохранить отметку «Не стартовал»')
    }
  }

  if (isLoading) return <Loading />
  if (groupsError) return <ErrorMessage message={(groupsErr as Error).message} />
  if (isError) return <ErrorMessage message={(error as Error).message} />
  if (!groups || groups.length === 0) {
    return <EmptyState text="Сначала добавьте группы участников на вкладке «Группы»" />
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-base font-medium text-fg">Участники</h2>
        <button
          type="button"
          onClick={() => setEditingParticipant(null)}
          className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
        >
          + Добавить
        </button>
      </div>
      {deleteError && (
        <div className="px-4 pt-2">
          <ErrorMessage message={deleteError} />
        </div>
      )}
      <TabBar tabs={tabs} active={effectiveTab} onChange={setSelectedTab} />

      {visibleParticipants.length === 0 ? (
        <EmptyState text="В этой группе пока нет участников" />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {visibleParticipants.map((p) => {
            const resultStatus = resultByParticipant.get(p.id)?.status
            const isDns = resultStatus === 'DNS'
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3">
                <div className="flex flex-col">
                  <span className="text-fg">
                    №{p.startNumber ?? '—'} {p.lastName} {p.firstName}
                  </span>
                  {effectiveTab === ALL_TAB && p.groupName && <span className="text-sm text-primary">{p.groupName}</span>}
                  {p.commandName?.trim() && <span className="text-sm text-on-surface-variant">{p.commandName}</span>}
                  {isDns && <span className="text-sm text-error">Не стартовал</span>}
                </div>
                <div className="flex shrink-0 gap-3">
                  <button type="button" onClick={() => setEditingParticipant(p)} className="text-sm text-fg">
                    Изменить
                  </button>
                  {!isDeletionLocked ? (
                    <button type="button" onClick={() => setDeletingParticipant(p)} className="text-sm text-error">
                      Удалить
                    </button>
                  ) : (
                    // Участник со стартом/финишем уже стартовал — для него отметка недоступна
                    (isDns || canBeMarkedDns(resultStatus)) && (
                      <button
                        type="button"
                        disabled={dnsSavingId === p.id}
                        onClick={() => handleToggleDns(p, !isDns)}
                        className={`text-sm disabled:opacity-50 ${isDns ? 'text-fg' : 'text-error'}`}
                      >
                        {isDns ? 'Снять «Не стартовал»' : 'Не стартовал'}
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingParticipant !== undefined && (
        <ParticipantEditorDialog
          competition={competition}
          groups={groups}
          defaultGroupId={effectiveTab !== ALL_TAB ? Number(effectiveTab) : groups[0]?.groupId}
          editingParticipant={editingParticipant}
          onDismiss={() => setEditingParticipant(undefined)}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: ['participants', competitionId] })
            setEditingParticipant(undefined)
          }}
        />
      )}

      {deletingParticipant && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить участника?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              {deletingParticipant.lastName} {deletingParticipant.firstName}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingParticipant(null)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg"
              >
                Отмена
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-md bg-error px-4 py-2 text-sm text-on-error">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
