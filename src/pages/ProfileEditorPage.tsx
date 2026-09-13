import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userRepository } from '../api/userRepository'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { TextInput } from '../components/TextInput'
import { useUserProfile } from '../features/profile/hooks'

export function ProfileEditorPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: profile, isLoading } = useUserProfile()

  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null)
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [birthDateStr, setBirthDateStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (profile && profile.id !== loadedProfileId) {
    setLoadedProfileId(profile.id)
    setLastName(profile.lastName)
    setFirstName(profile.firstName)
    setMiddleName(profile.middleName ?? '')
    setBirthDateStr(profile.birthDate != null ? new Date(profile.birthDate).toISOString().slice(0, 10) : '')
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    const result = await userRepository.updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName.trim() || null,
      birth_date: birthDateStr ? new Date(birthDateStr).getTime() : null,
    })
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      navigate('/profile')
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  const canSave = !saving && lastName.trim() !== '' && firstName.trim() !== ''

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Редактирование профиля</h1>
      </header>

      {isLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <TextInput label="Фамилия" value={lastName} onChange={setLastName} />
          <TextInput label="Имя" value={firstName} onChange={setFirstName} />
          <TextInput label="Отчество" value={middleName} onChange={setMiddleName} />
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Дата рождения</span>
            <input
              type="date"
              value={birthDateStr}
              onChange={(e) => setBirthDateStr(e.target.value)}
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
          </label>

          {error && <ErrorMessage message={error} />}

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      )}
    </div>
  )
}
