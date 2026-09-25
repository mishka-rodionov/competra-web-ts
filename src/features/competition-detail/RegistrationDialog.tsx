import { useState } from 'react'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { ParticipantGroupDetail, RegisterEventRequest } from '../../types/competition'
import { useUserProfile } from '../profile/hooks'

interface RegistrationDialogProps {
  group: ParticipantGroupDetail
  competitionId: string
  onDismiss: () => void
  onConfirm: (request: RegisterEventRequest) => void
}

/** Данные из профиля подставляются автоматически; поля показываем только если профиль их не заполнил. */
export function RegistrationDialog({ group, competitionId, onDismiss, onConfirm }: RegistrationDialogProps) {
  const { data: profile, isLoading: isProfileLoading } = useUserProfile()
  const hasProfileName = !!profile?.firstName?.trim() && !!profile?.lastName?.trim()
  // Поля ввода нужны только когда в профиле нет имени — их state не зависит от профиля,
  // иначе при первом открытии (профиль ещё грузится) он застывал бы пустым.
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    const first = (hasProfileName ? profile!.firstName : firstName).trim()
    const last = (hasProfileName ? profile!.lastName : lastName).trim()
    if (!first || !last) {
      setError('Заполните имя и фамилию')
      return
    }
    onConfirm({ competitionId, groupId: group.groupId, firstName: first, lastName: last })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="w-full max-w-sm rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Регистрация: {group.title}</h3>
        <div className="mt-3 flex flex-col gap-2">
          {isProfileLoading ? (
            <span className="text-sm text-on-surface-variant">Загрузка профиля…</span>
          ) : hasProfileName ? (
            <>
              <span className="text-sm text-on-surface-variant">Регистрация от имени:</span>
              <span className="text-base text-fg">
                {profile!.lastName} {profile!.firstName}
              </span>
            </>
          ) : (
            <>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
              />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
                className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
              />
            </>
          )}
          {error && <ErrorMessage message={error} />}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProfileLoading}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  )
}
