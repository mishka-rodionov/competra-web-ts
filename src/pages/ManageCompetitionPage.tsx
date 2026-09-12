import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { DistancesTab } from '../features/competition-detail/DistancesTab'
import { EditCompetitionTab } from '../features/management/EditCompetitionTab'
import { useManagedCompetition } from '../features/management/hooks'
import { ManageGroupsTab } from '../features/management/ManageGroupsTab'
import { ManageResultsTab } from '../features/management/ManageResultsTab'
import { ParticipantsManageTab } from '../features/management/ParticipantsManageTab'

const TABS = [
  { key: 'edit', label: 'Общее' },
  { key: 'groups', label: 'Группы' },
  { key: 'participants', label: 'Участники' },
  { key: 'distances', label: 'Дистанции' },
  { key: 'results', label: 'Результаты' },
]

/** Организаторский экран — редактирование уже созданного соревнования (в отличие от /competition/:id, публичного просмотра). */
export function ManageCompetitionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('edit')
  const { data: competition, isLoading, isError, error } = useManagedCompetition(id!)

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
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex-1 overflow-y-auto">
            {tab === 'edit' && <EditCompetitionTab competition={competition} />}
            {tab === 'groups' && (
              <ManageGroupsTab competitionId={competition.competitionId} isByChoice={competition.direction === 'BY_CHOICE'} />
            )}
            {tab === 'participants' && <ParticipantsManageTab competition={competition} />}
            {tab === 'distances' && (
              <DistancesTab
                competitionId={competition.competitionId}
                showImport
                isByChoice={competition.direction === 'BY_CHOICE'}
              />
            )}
            {tab === 'results' && <ManageResultsTab competition={competition} />}
          </div>
        </>
      )}
    </div>
  )
}
