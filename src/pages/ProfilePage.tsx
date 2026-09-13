import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRepository } from '../api/authRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { LoginForm } from '../features/auth/LoginForm'
import { useUpcomingCompetitions, useUserProfile } from '../features/profile/hooks'
import { toLocaleDateString } from '../lib/dateUtils'

const ORGANIZER_GUIDE_URL = 'guides/first-competition-guide.html'

export function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isLoggedIn = useIsLoggedIn()
  const [showLogin, setShowLogin] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const { data: upcoming, isLoading: upcomingLoading, isError, error } = useUpcomingCompetitions()

  function handleLoginSuccess() {
    setShowLogin(false)
    navigate('/')
  }

  function handleLogout() {
    authRepository.logout()
    queryClient.clear()
    navigate('/')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    const result = await authRepository.deleteAccount()
    if (result.kind === 'success') {
      authRepository.logout()
      queryClient.clear()
      setShowDeleteConfirm(false)
      navigate('/')
    } else {
      setDeleteError(result.message)
    }
    setDeleting(false)
  }

  if (showLogin) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} onPrivacyClick={() => navigate('/privacy')} />
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center gap-4 p-8 text-center">
        <h1 className="mt-8 text-xl font-medium text-fg">Вы не вошли в аккаунт</h1>
        <p className="text-base text-on-surface-variant">
          Войдите, чтобы видеть свои регистрации и управлять соревнованиями
        </p>
        <button
          type="button"
          onClick={() => setShowLogin(true)}
          className="w-full max-w-xs rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          Войти / Зарегистрироваться
        </button>
        <div className="w-full max-w-xs">
          <ProfileLinks />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-lg border border-outline-variant bg-surface p-4">
        {profileLoading ? (
          <Loading />
        ) : profile ? (
          <div className="flex flex-col gap-1">
            <span className="text-lg font-medium text-fg">{`${profile.lastName} ${profile.firstName}`.trim()}</span>
            <span className="text-base text-on-surface-variant">{profile.email}</span>
            {profile.birthDate != null && (
              <span className="text-sm text-on-surface-variant">Дата рождения: {toLocaleDateString(profile.birthDate)}</span>
            )}
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="mt-2 self-start rounded-md border border-outline px-3 py-1.5 text-sm text-fg"
            >
              Редактировать профиль
            </button>
          </div>
        ) : (
          <span className="text-base font-medium text-fg">Профиль пользователя</span>
        )}
      </div>

      <h2 className="text-base font-medium text-fg">Предстоящие старты</h2>
      {upcomingLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !upcoming || upcoming.length === 0 ? (
        <EmptyState text="Нет предстоящих стартов" />
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((competition) => (
            <button
              key={competition.competitionId}
              type="button"
              onClick={() => navigate(`/competition/${competition.competitionId}`)}
              className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 text-left"
            >
              <span className="text-sm font-medium text-fg">{competition.competition.title}</span>
              <span className="text-sm text-on-surface-variant">{toLocaleDateString(competition.competition.startDate)}</span>
              {competition.competition.address && (
                <span className="text-sm text-on-surface-variant">{competition.competition.address}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <hr className="border-outline-variant" />
      <ProfileLinks />

      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-md border border-error px-4 py-2 text-sm text-error"
      >
        Выйти из аккаунта
      </button>
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full rounded-md border border-error px-4 py-2 text-sm text-error"
      >
        Удалить аккаунт
      </button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить аккаунт?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Аккаунт и связанные с ним данные будут удалены безвозвратно. Это действие необратимо.
            </p>
            {deleteError && <ErrorMessage message={deleteError} />}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
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

/** «Редактировать профиль» из старого приложения намеренно опущена — ProfileEditorPage ещё не перенесена. */
function ProfileLinks() {
  const navigate = useNavigate()
  return (
    <div className="flex w-full flex-col gap-2">
      <a
        href={ORGANIZER_GUIDE_URL}
        target="_blank"
        rel="noreferrer"
        className="w-full rounded-md border border-outline px-4 py-2 text-center text-sm text-fg"
      >
        Инструкция для организатора
      </a>
      <button
        type="button"
        onClick={() => navigate('/about')}
        className="w-full rounded-md border border-outline px-4 py-2 text-sm text-fg"
      >
        О приложении
      </button>
      <button
        type="button"
        onClick={() => navigate('/privacy')}
        className="w-full rounded-md border border-outline px-4 py-2 text-sm text-fg"
      >
        Политика конфиденциальности
      </button>
    </div>
  )
}
