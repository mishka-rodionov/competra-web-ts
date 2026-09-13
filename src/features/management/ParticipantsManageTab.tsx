import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { resultRepository } from '../../api/resultRepository'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { TabBar } from '../../components/TabBar'
import type { OrienteeringCompetition } from '../../types/competition'
import type { OrienteeringParticipant } from '../../types/participant'
import { useParticipants } from '../competition-detail/hooks'
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
      setDeleteError('Не удалось удалить участника')
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
          {visibleParticipants.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3">
              <div className="flex flex-col">
                <span className="text-fg">
                  №{p.startNumber ?? '—'} {p.lastName} {p.firstName}
                </span>
                {effectiveTab === ALL_TAB && p.groupName && <span className="text-sm text-primary">{p.groupName}</span>}
                {p.commandName?.trim() && <span className="text-sm text-on-surface-variant">{p.commandName}</span>}
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" onClick={() => setEditingParticipant(p)} className="text-sm text-fg">
                  Изменить
                </button>
                <button type="button" onClick={() => setDeletingParticipant(p)} className="text-sm text-error">
                  Удалить
                </button>
              </div>
            </div>
          ))}
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
