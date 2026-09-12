import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { competitionRepository } from '../api/competitionRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { LoginForm } from '../features/auth/LoginForm'
import { useMyCompetitions } from '../features/competitions/hooks'
import { statusColorClass, statusLabel } from '../features/competitions/labels'
import { toLocaleDateString } from '../lib/dateUtils'
import type { OrienteeringCompetition } from '../types/competition'

export function ManagementPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isLoggedIn = useIsLoggedIn()
  const [showLogin, setShowLogin] = useState(false)
  const [deletingCompetition, setDeletingCompetition] = useState<OrienteeringCompetition | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: competitions, isLoading, isError, error } = useMyCompetitions(isLoggedIn)
  const sorted = [...(competitions ?? [])].sort((a, b) => b.competition.startDate - a.competition.startDate)

  async function handleDelete() {
    if (!deletingCompetition) return
    setDeleting(true)
    setDeleteError(null)
    const result = await competitionRepository.deleteCompetition(deletingCompetition.competitionId)
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['my-competitions'] })
      setDeletingCompetition(null)
    } else {
      setDeleteError(result.message)
    }
    setDeleting(false)
  }

  if (showLogin) {
    return <LoginForm onLoginSuccess={() => setShowLogin(false)} onPrivacyClick={() => navigate('/privacy')} />
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center gap-4 p-8 text-center">
        <h1 className="mt-8 text-xl font-medium text-fg">Только для организаторов</h1>
        <p className="text-base text-on-surface-variant">Войдите, чтобы создавать соревнования и управлять ими</p>
        <button
          type="button"
          onClick={() => setShowLogin(true)}
          className="w-full max-w-xs rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          Войти
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h1 className="text-lg font-medium text-fg">Управление</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/management/create?past=1')}
            className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
          >
            + Прошедшее
          </button>
          <button
            type="button"
            onClick={() => navigate('/management/create')}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary"
          >
            + Создать
          </button>
        </div>
      </header>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-medium text-fg">Нет соревнований</h2>
          <p className="text-base text-on-surface-variant">Создайте первое соревнование</p>
          <button
            type="button"
            onClick={() => navigate('/management/create')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
          >
            Создать
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {sorted.map((competition) => (
            <div key={competition.competitionId} className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex-1 text-base font-medium text-fg">{competition.competition.title}</span>
                <span className={`shrink-0 text-xs font-medium ${statusColorClass(competition.competition.status)}`}>
                  {statusLabel(competition.competition.status)}
                </span>
              </div>
              <span className="text-sm text-on-surface-variant">{toLocaleDateString(competition.competition.startDate)}</span>
              {competition.competition.address && (
                <span className="text-sm text-on-surface-variant">{competition.competition.address}</span>
              )}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/management/${competition.competitionId}`)}
                  className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
                >
                  Управлять
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null)
                    setDeletingCompetition(competition)
                  }}
                  aria-label="Удалить соревнование"
                  className="text-sm text-error"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deletingCompetition && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить соревнование?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              «{deletingCompetition.competition.title}» будет удалено безвозвратно.
            </p>
            {deleteError && <ErrorMessage message={deleteError} />}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingCompetition(null)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 rounded-md bg-error px-4 py-2 text-sm text-on-error disabled:opacity-50"
              >
                {deleting ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
