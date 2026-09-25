import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clubRepository } from '../api/clubRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { ErrorMessage } from '../components/ErrorMessage'
import { AuthFlow } from '../features/auth/AuthFlow'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents } from '../lib/analytics/events'

export function CreateClubPage() {
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [allowJoinRequests, setAllowJoinRequests] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isLoggedIn) {
    return <AuthFlow onLoginSuccess={() => {}} />
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Укажите название клуба')
      return
    }
    setError(null)
    setSaving(true)
    const result = await clubRepository.createClub({
      name: name.trim(),
      description: description.trim() || null,
      allowJoinRequests,
    })
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.clubCreated(result.data.id))
      navigate(`/clubs/${result.data.id}`)
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Новый клуб</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Название *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowJoinRequests} onChange={(e) => setAllowJoinRequests(e.target.checked)} />
          <span className="text-sm text-fg">Разрешить заявки на вступление</span>
        </label>

        {error && <ErrorMessage message={error} />}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
        >
          {saving ? 'Создание…' : 'Создать'}
        </button>
      </div>
    </div>
  )
}
