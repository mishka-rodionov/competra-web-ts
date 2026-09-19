import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clubRepository } from '../api/clubRepository'
import { teamRepository } from '../api/teamRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { AuthFlow } from '../features/auth/AuthFlow'
import { ClubRatingsTab } from '../features/clubs/ClubRatingsTab'
import { CreateTeamDialog } from '../features/clubs/CreateTeamDialog'
import { EditClubDialog } from '../features/clubs/EditClubDialog'
import { useClub, useClubMembers, useMyJoinRequests, useTeamsByClub } from '../features/clubs/hooks'
import { MembersTab } from '../features/clubs/MembersTab'
import { TeamsTab } from '../features/clubs/TeamsTab'
import { useUserProfile } from '../features/profile/hooks'
import type { Club } from '../types/club'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'

const TABS = [
  { key: 'members', label: 'Участники' },
  { key: 'teams', label: 'Команды' },
  { key: 'ratings', label: 'Рейтинги' },
]

export function ClubDetailPage() {
  const { id } = useParams<{ id: string }>()
  const clubId = id!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isLoggedIn = useIsLoggedIn()

  const { data: club, isLoading, isError, error } = useClub(clubId)
  const { data: members } = useClubMembers(clubId)
  const { data: teams } = useTeamsByClub(clubId)
  const { data: profile } = useUserProfile()
  const { data: joinRequests } = useMyJoinRequests()

  const [tab, setTab] = useState('members')
  const [showLogin, setShowLogin] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)

  const myMembership = members?.find((m) => m.userId === profile?.id)
  const isAdmin = myMembership?.role === 'FOUNDER' || myMembership?.role === 'ADMIN'
  const isFounder = myMembership?.role === 'FOUNDER'
  const myPendingRequest = joinRequests?.some((r) => r.clubId === clubId && r.status === 'PENDING') ?? false

  async function invalidateMembers() {
    // Инвалидируем и сам клуб — membersCount в нём иначе не обновится после выхода/исключения/смены роли.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['club-members', clubId] }),
      queryClient.invalidateQueries({ queryKey: ['club', clubId] }),
    ])
  }

  async function handleJoinRequest() {
    if (!isLoggedIn) {
      setShowLogin(true)
      return
    }
    setRequesting(true)
    const result = await clubRepository.createJoinRequest(clubId)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubJoinRequested(clubId))
      await queryClient.invalidateQueries({ queryKey: ['my-join-requests'] })
    } else {
      setActionError('Не удалось подать заявку')
    }
    setRequesting(false)
  }

  async function handleLeave() {
    if (!profile) return
    const result = await clubRepository.removeMember(clubId, profile.id)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubMemberRemoved(clubId, true))
      await invalidateMembers()
    } else {
      setActionError('Не удалось выйти из клуба (возможно, вы единственный основатель)')
    }
  }

  async function handleRemoveMember(userId: string) {
    const result = await clubRepository.removeMember(clubId, userId)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubMemberRemoved(clubId, false))
      await invalidateMembers()
    } else setActionError('Не удалось удалить участника')
  }

  async function handleChangeRole(userId: string, role: string) {
    const result = await clubRepository.changeMemberRole(clubId, userId, { role })
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubMemberRoleChanged(clubId, role))
      await invalidateMembers()
    } else setActionError('Не удалось изменить роль')
  }

  async function handleDeleteClub() {
    const result = await clubRepository.deleteClub(clubId)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubDeleted(clubId))
      navigate('/clubs')
    } else setActionError('Не удалось удалить клуб')
    setShowDeleteConfirm(false)
  }

  async function handleCreateTeam(name: string, sportType: string) {
    const result = await teamRepository.createTeam(clubId, { name, sportType })
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubTeamCreated(clubId))
      await queryClient.invalidateQueries({ queryKey: ['teams', clubId] })
      setShowCreateTeamDialog(false)
    } else {
      setActionError(result.message)
    }
  }

  function handleClubSaved(updated: Club) {
    queryClient.setQueryData(['club', clubId], updated)
    setShowEditDialog(false)
  }

  if (showLogin) {
    return <AuthFlow onLoginSuccess={() => setShowLogin(false)} onPrivacyClick={() => navigate('/privacy')} />
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate('/clubs')} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">{club?.name ?? 'Клуб'}</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !club ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Клуб не найден'} />
      ) : (
        <>
          <div className="flex flex-col gap-2 p-4">
            {club.description?.trim() && <p className="text-base text-fg">{club.description}</p>}
            <span className="text-sm text-on-surface-variant">Участников: {club.membersCount}</span>
            {actionError && <ErrorMessage message={actionError} />}

            <div className="flex flex-wrap gap-2 pt-1">
              {!myMembership ? (
                club.allowJoinRequests ? (
                  <button
                    type="button"
                    onClick={handleJoinRequest}
                    disabled={myPendingRequest || requesting}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
                  >
                    {myPendingRequest ? 'Заявка отправлена' : 'Подать заявку'}
                  </button>
                ) : (
                  <span className="text-sm text-on-surface-variant">Клуб не принимает заявки</span>
                )
              ) : (
                <button type="button" onClick={handleLeave} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
                  Покинуть клуб
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowEditDialog(true)}
                  className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
                >
                  Редактировать
                </button>
              )}
              {isFounder && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-md border border-outline px-3 py-1.5 text-sm text-error"
                >
                  Удалить клуб
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate(`/clubs/${clubId}/join-requests`)}
                  className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
                >
                  Заявки
                </button>
              )}
            </div>
          </div>

          <TabBar tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex-1 overflow-y-auto">
            {tab === 'members' && (
              <MembersTab
                members={members ?? []}
                isFounder={isFounder}
                currentUserId={profile?.id}
                onRemove={handleRemoveMember}
                onChangeRole={handleChangeRole}
              />
            )}
            {tab === 'teams' && (
              <TeamsTab
                teams={teams ?? []}
                isAdmin={isAdmin}
                onTeamClick={(teamId) => navigate(`/teams/${teamId}`)}
                onAddTeam={() => setShowCreateTeamDialog(true)}
              />
            )}
            {tab === 'ratings' && (
              <ClubRatingsTab
                clubId={clubId}
                isAdmin={isAdmin}
                onRatingClick={(ratingId) => navigate(`/ratings/${ratingId}`)}
                onCreateRating={() => navigate(`/ratings/create?clubId=${clubId}`)}
              />
            )}
          </div>
        </>
      )}

      {showEditDialog && club && (
        <EditClubDialog club={club} onDismiss={() => setShowEditDialog(false)} onSaved={handleClubSaved} />
      )}

      {showCreateTeamDialog && (
        <CreateTeamDialog onDismiss={() => setShowCreateTeamDialog(false)} onCreate={handleCreateTeam} />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить клуб?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Соревнования, созданные от лица клуба, останутся, но потеряют владельца. Действие необратимо.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg"
              >
                Отмена
              </button>
              <button type="button" onClick={handleDeleteClub} className="flex-1 rounded-md bg-error px-4 py-2 text-sm text-on-error">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
