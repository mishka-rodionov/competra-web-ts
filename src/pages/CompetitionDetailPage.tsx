import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { competitionRepository } from '../api/competitionRepository'
import { DebugErrorBanner } from '../components/DebugErrorBanner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TabBar } from '../components/TabBar'
import { DistancesTab } from '../features/competition-detail/DistancesTab'
import { GroupsTab } from '../features/competition-detail/GroupsTab'
import { useCompetitionDetail } from '../features/competition-detail/hooks'
import { InfoTab } from '../features/competition-detail/InfoTab'
import { ResultsTab } from '../features/competition-detail/ResultsTab'
import { StartProtocolTab } from '../features/competition-detail/StartProtocolTab'
import type { RegisterEventRequest } from '../types/competition'

const TABS = [
  { key: 'info', label: 'О соревновании' },
  { key: 'groups', label: 'Группы' },
  { key: 'distances', label: 'Дистанции' },
  { key: 'start', label: 'Стартовый протокол' },
  { key: 'results', label: 'Результаты' },
]

/**
 * Отдельный full-screen роут вне AppShell (без нижней навигации) — как и в старом приложении,
 * где Page.CompetitionDetail замещал MainScaffold целиком, а не открывался поверх таб-бара.
 */
export function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('info')
  const [registeredGroupId, setRegisteredGroupId] = useState<number | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const { data: detail, isLoading, isError, error } = useCompetitionDetail(id!)

  // Регистрация — эфемерное состояние страницы, не персистится (не читаем detail.isUserRegistered) —
  // так же вело себя и старое приложение: обновление страницы сбрасывает "вы зарегистрированы".
  async function handleRegister(request: RegisterEventRequest) {
    const result = await competitionRepository.register(request)
    if (result.kind === 'success') {
      setRegisteredGroupId(request.groupId)
      setRegisterError(null)
    } else {
      setRegisterError(result.message)
    }
  }

  async function handleCancelRegistration() {
    if (!detail) return
    const result = await competitionRepository.cancelRegistration(detail.id)
    if (result.kind === 'success') setRegisteredGroupId(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate('/')} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">{detail?.title ?? 'Соревнование'}</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError || !detail ? (
        <ErrorMessage message={isError ? (error as Error).message : 'Соревнование не найдено'} />
      ) : (
        <>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex-1 overflow-y-auto">
            {tab === 'info' && <InfoTab detail={detail} />}
            {tab === 'groups' && (
              <GroupsTab
                competitionId={detail.id}
                groups={detail.participantGroups}
                registrationOpen={detail.status === 'REGISTRATION_OPEN'}
                registeredGroupId={registeredGroupId}
                registerError={registerError}
                onRegister={handleRegister}
                onCancelRegistration={handleCancelRegistration}
              />
            )}
            {tab === 'distances' && <DistancesTab competitionId={detail.id} />}
            {tab === 'start' && (
              <StartProtocolTab competitionId={detail.id} groups={detail.participantGroups} timeZoneId={detail.timeZoneId} />
            )}
            {tab === 'results' && (
              <ResultsTab
                competitionId={detail.id}
                groups={detail.participantGroups}
                competitionStatus={detail.status}
                resultsStatus={detail.resultsStatus}
                direction={detail.direction}
              />
            )}
          </div>
        </>
      )}

      <DebugErrorBanner />
    </div>
  )
}
