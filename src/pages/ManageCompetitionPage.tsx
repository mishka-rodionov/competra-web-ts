import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { DistancesTab } from '../features/competition-detail/DistancesTab'
import { useDistances } from '../features/competition-detail/hooks'
import { EditCompetitionTab } from '../features/management/EditCompetitionTab'
import { LinkRequestsTab } from '../features/management/LinkRequestsTab'
import { useGroups, useManagedCompetition } from '../features/management/hooks'
import { ManageGroupsTab } from '../features/management/ManageGroupsTab'
import { ManageResultsTab } from '../features/management/ManageResultsTab'
import { GroupsWithoutDistanceBanner } from '../features/management/NoDistanceNotice'
import { ParticipantsManageTab } from '../features/management/ParticipantsManageTab'
import { usePendingLinkCounts } from '../features/participant-links/hooks'
import { ranksByScore } from '../lib/byChoiceMode'
import { groupsWithoutDistance } from '../lib/groupDistance'

const TABS = [
  { key: 'edit', label: 'Общее' },
  { key: 'groups', label: 'Группы' },
  { key: 'participants', label: 'Участники' },
  { key: 'distances', label: 'Дистанции' },
  { key: 'results', label: 'Результаты' },
  { key: 'links', label: 'Заявки' },
]

/** Организаторский экран — редактирование уже созданного соревнования (в отличие от /competition/:id, публичного просмотра). */
export function ManageCompetitionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('edit')
  const { data: competition, isLoading, isError, error } = useManagedCompetition(id!)
  const { data: pendingCounts } = usePendingLinkCounts()
  const pendingLinks = pendingCounts?.[id!] ?? 0
  const tabs = TABS.map((t) => (t.key === 'links' && pendingLinks > 0 ? { ...t, label: `Заявки (${pendingLinks})` } : t))
  const { data: groups } = useGroups(id!)
  const { data: distances } = useDistances(id!)
  // У прошедшего соревнования (импорт протоколов) группы без дистанций — норма, напоминать не о чем.
  const isFinished = competition?.competition.status === 'FINISHED' || competition?.competition.status === 'ARCHIVED'
  const noDistanceTitles =
    groups && distances && !isFinished ? groupsWithoutDistance(groups, distances).map((g) => g.title) : []

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate('/management')} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">{competition?.competition.title ?? 'Соревнование'}</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !competition ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Соревнование не найдено'} />
      ) : (
        <>
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          {noDistanceTitles.length > 0 && (
            <div className="px-4 pt-4">
              <GroupsWithoutDistanceBanner titles={noDistanceTitles} onOpenGroups={tab === 'groups' ? undefined : () => setTab('groups')} />
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {tab === 'edit' && <EditCompetitionTab competition={competition} />}
            {tab === 'groups' && (
              <ManageGroupsTab
                competitionId={competition.competitionId}
                isScoreO={ranksByScore(competition.direction, competition.byChoiceMode)}
                competitionControlTimeMinutes={competition.controlTimeMinutes}
                competitionTeamCounted={competition.teamScoring?.groupCountedResults ?? null}
              />
            )}
            {tab === 'participants' && <ParticipantsManageTab competition={competition} />}
            {tab === 'distances' && (
              <DistancesTab
                competitionId={competition.competitionId}
                showImport
                direction={competition.direction}
                byChoiceMode={competition.byChoiceMode}
                isStartCpRequired={competition.startTimeMode === 'BY_START_STATION'}
              />
            )}
            {tab === 'results' && <ManageResultsTab competition={competition} />}
            {tab === 'links' && <LinkRequestsTab competitionId={competition.competitionId} />}
          </div>
        </>
      )}
    </div>
  )
}
