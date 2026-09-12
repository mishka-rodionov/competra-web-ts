import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { teamRepository } from '../api/teamRepository'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { AddTeamMemberDialog } from '../features/clubs/AddTeamMemberDialog'
import { useClubMembers, useTeam, useTeamMembers } from '../features/clubs/hooks'
import { teamRoleLabel } from '../features/clubs/labels'
import { EditTeamDialog } from '../features/clubs/EditTeamDialog'
import { sportLabel } from '../features/competitions/labels'
import { useUserProfile } from '../features/profile/hooks'
import type { Team } from '../types/team'

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const teamId = id!
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: team, isLoading, isError, error } = useTeam(teamId)
  const { data: teamMembers } = useTeamMembers(teamId)
  const { data: clubMembers } = useClubMembers(team?.clubId ?? '')
  const { data: profile } = useUserProfile()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const myClubRole = clubMembers?.find((m) => m.userId === profile?.id)?.role
  const isClubAdmin = myClubRole === 'FOUNDER' || myClubRole === 'ADMIN'

  async function invalidateTeamMembers() {
    await queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
  }

  async function handleChangeRole(clubMemberId: string, role: string) {
    const result = await teamRepository.changeTeamMemberRole(teamId, clubMemberId, { role })
    if (result.kind === 'success') await invalidateTeamMembers()
    else setActionError('Не удалось изменить роль')
  }

  async function handleRemove(clubMemberId: string) {
    const result = await teamRepository.removeTeamMember(teamId, clubMemberId)
    if (result.kind === 'success') await invalidateTeamMembers()
    else setActionError('Не удалось удалить участника')
  }

  async function handleAddMember(clubMemberId: string) {
    const result = await teamRepository.addTeamMember(teamId, { clubMemberId, role: 'MEMBER' })
    if (result.kind === 'success') {
      await invalidateTeamMembers()
      setShowAddMemberDialog(false)
    } else {
      setActionError('Не удалось добавить участника')
    }
  }

  function handleTeamSaved(updated: Team) {
    queryClient.setQueryData(['team', teamId], updated)
    setShowEditDialog(false)
  }

  const availableClubMembers = (clubMembers ?? []).filter((cm) => !(teamMembers ?? []).some((tm) => tm.clubMemberId === cm.id))

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">{team?.name ?? 'Команда'}</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !team ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Команда не найдена'} />
      ) : (
        <>
          <div className="flex flex-col gap-2 p-4">
            <span className="text-sm text-on-surface-variant">{sportLabel(team.sportType)}</span>
            {actionError && <ErrorMessage message={actionError} />}
            {isClubAdmin && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowEditDialog(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
                  Редактировать
                </button>
                <button type="button" onClick={() => setShowAddMemberDialog(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
                  + Участник
                </button>
              </div>
            )}
          </div>

          {(teamMembers ?? []).length === 0 ? (
            <p className="p-4 text-center text-base text-on-surface-variant">В команде пока нет участников</p>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {(teamMembers ?? []).map((member) => {
                const isSelf = member.userId === profile?.id
                const canManage = isClubAdmin || isSelf
                return (
                  <div key={member.id} className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
                    <div className="flex flex-col">
                      <span className="text-fg">{`${member.lastName} ${member.firstName}`.trim()}</span>
                      <span className="text-sm text-primary">{teamRoleLabel(member.role)}</span>
                    </div>
                    {canManage && (
                      <div className="flex flex-wrap gap-3">
                        {isClubAdmin && member.role === 'MEMBER' && (
                          <button type="button" onClick={() => handleChangeRole(member.clubMemberId, 'CAPTAIN')} className="text-sm text-fg">
                            Назначить капитаном
                          </button>
                        )}
                        {isClubAdmin && member.role === 'CAPTAIN' && (
                          <button type="button" onClick={() => handleChangeRole(member.clubMemberId, 'MEMBER')} className="text-sm text-fg">
                            Снять капитана
                          </button>
                        )}
                        <button type="button" onClick={() => handleRemove(member.clubMemberId)} className="text-sm text-error">
                          {isSelf ? 'Покинуть команду' : 'Удалить из команды'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showEditDialog && team && <EditTeamDialog team={team} onDismiss={() => setShowEditDialog(false)} onSaved={handleTeamSaved} />}
      {showAddMemberDialog && (
        <AddTeamMemberDialog candidates={availableClubMembers} onDismiss={() => setShowAddMemberDialog(false)} onAdd={handleAddMember} />
      )}
    </div>
  )
}
