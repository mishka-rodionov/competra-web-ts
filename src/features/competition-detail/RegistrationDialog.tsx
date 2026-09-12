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
  const { data: profile } = useUserProfile()
  const hasProfileName = !!profile?.firstName?.trim() && !!profile?.lastName?.trim()
  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Заполните имя и фамилию')
      return
    }
    onConfirm({ competitionId, groupId: group.groupId, firstName: firstName.trim(), lastName: lastName.trim() })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="w-full max-w-sm rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Регистрация: {group.title}</h3>
        <div className="mt-3 flex flex-col gap-2">
          {hasProfileName ? (
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
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary"
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  )
}
