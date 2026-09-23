import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { groupRepository } from '../../api/groupRepository'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import type { ParticipantGroupDetail } from '../../types/competition'
import { genderLabel } from '../competitions/labels'
import { useDistances } from '../competition-detail/hooks'
import { AddGroupDialog } from './AddGroupDialog'
import { useGroups } from './hooks'

interface ManageGroupsTabProps {
  competitionId: string
  isByChoice: boolean
  /** КВ соревнования — умолчание для групп без своего значения. */
  competitionControlTimeMinutes: number | null
}

export function ManageGroupsTab({ competitionId, isByChoice, competitionControlTimeMinutes }: ManageGroupsTabProps) {
  const queryClient = useQueryClient()
  const { data: groups, isLoading, isError, error } = useGroups(competitionId)
  const { data: distances } = useDistances(competitionId)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(groupId: number) {
    const result = await groupRepository.deleteGroup(groupId)
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['groups', competitionId] })
    } else {
      setDeleteError('Не удалось удалить группу')
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-fg">Группы участников</h2>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
        >
          + Добавить
        </button>
      </div>

      {deleteError && <ErrorMessage message={deleteError} />}

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !groups || groups.length === 0 ? (
        <EmptyState text="Нет групп. Добавьте первую группу." />
      ) : (
        groups.map((group) => (
          <GroupRow
            key={group.groupId}
            group={group}
            competitionControlTimeMinutes={competitionControlTimeMinutes}
            onDelete={() => handleDelete(group.groupId)}
          />
        ))
      )}

      {showAddDialog && (
        <AddGroupDialog
          competitionId={competitionId}
          distances={distances ?? []}
          isByChoice={isByChoice}
          competitionControlTimeMinutes={competitionControlTimeMinutes}
          onDismiss={() => setShowAddDialog(false)}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: ['groups', competitionId] })
            setShowAddDialog(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * Итоговое КВ группы. Наследование считаем здесь: /participantGroups отдаёт только собственное
 * значение группы (timeLimitMinutes), без КВ соревнования.
 */
function controlTimeLabel(group: ParticipantGroupDetail, competitionControlTimeMinutes: number | null): string | null {
  const minutes = group.timeLimitMinutes ?? competitionControlTimeMinutes
  if (minutes == null) return null
  return group.timeLimitMinutes == null ? `КВ: ${minutes} мин (от соревнования)` : `КВ: ${minutes} мин`
}

function GroupRow({
  group,
  competitionControlTimeMinutes,
  onDelete,
}: {
  group: ParticipantGroupDetail
  competitionControlTimeMinutes: number | null
  onDelete: () => void
}) {
  const details = [
    group.gender ? genderLabel(group.gender) : null,
    group.minAge != null || group.maxAge != null ? `${group.minAge ?? ''}–${group.maxAge ?? ''} лет` : null,
    group.distanceName ? `Дистанция: ${group.distanceName}` : null,
    group.maxParticipants != null ? `Мест: ${group.registeredCount}/${group.maxParticipants}` : null,
    controlTimeLabel(group, competitionControlTimeMinutes),
    group.scorePenaltyPerMinute != null ? `Штраф: ${group.scorePenaltyPerMinute} очк/мин` : null,
  ].filter((v): v is string => !!v)

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-outline-variant bg-surface p-3">
      <div className="flex flex-col">
        <span className="font-semibold text-fg">{group.title}</span>
        {details.length > 0 && <span className="text-sm text-on-surface-variant">{details.join('  •  ')}</span>}
      </div>
      <button type="button" onClick={onDelete} className="text-sm text-error">
        Удалить
      </button>
    </div>
  )
}
