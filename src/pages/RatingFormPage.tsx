import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ratingRepository } from '../api/ratingRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { AuthFlow } from '../features/auth/AuthFlow'
import { useRating } from '../features/ratings/hooks'
import { RatingGroupEditor, type RatingGroupDraft } from '../features/ratings/RatingGroupEditor'

let nextLocalIdCounter = 0

function draftsFromRating(groups: { id: number; title: string; gender: string | null; minAge: number | null; maxAge: number | null }[]): RatingGroupDraft[] {
  return groups.map((g) => ({
    localId: nextLocalIdCounter++,
    id: g.id,
    title: g.title,
    gender: g.gender,
    minAge: g.minAge?.toString() ?? '',
    maxAge: g.maxAge?.toString() ?? '',
  }))
}

/** Обслуживает и создание (/ratings/create?clubId=...), и редактирование (/ratings/:id/edit). */
export function RatingFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()
  const isEdit = id != null

  const { data: existingRating, isLoading: ratingLoading } = useRating(id ?? '')

  const [name, setName] = useState('')
  const [groups, setGroups] = useState<RatingGroupDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Инициализация формы данными рейтинга при их загрузке — во время рендера (не в эффекте),
  // как рекомендует React для производного состояния; loadedRatingId — метка "уже подставили".
  const [loadedRatingId, setLoadedRatingId] = useState<string | null>(null)
  if (existingRating && existingRating.id !== loadedRatingId) {
    setLoadedRatingId(existingRating.id)
    setName(existingRating.name)
    setGroups(draftsFromRating(existingRating.groups))
  }

  if (!isLoggedIn) {
    return <AuthFlow onLoginSuccess={() => {}} onPrivacyClick={() => navigate('/privacy')} />
  }

  if (isEdit && ratingLoading) return <Loading />

  const clubId = isEdit ? existingRating?.ownerClubId : searchParams.get('clubId')

  function addGroup() {
    setGroups([...groups, { localId: nextLocalIdCounter++, id: null, title: '', gender: null, minAge: '', maxAge: '' }])
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Укажите название рейтинга')
      return
    }
    if (groups.length === 0 || groups.some((g) => !g.title.trim())) {
      setError('Добавьте хотя бы одну группу и заполните её название')
      return
    }
    setError(null)
    setSaving(true)

    const request = {
      name: name.trim(),
      groups: groups.map((g, index) => ({
        id: g.id,
        title: g.title.trim(),
        gender: g.gender,
        minAge: g.minAge ? parseInt(g.minAge, 10) : null,
        maxAge: g.maxAge ? parseInt(g.maxAge, 10) : null,
        orderIndex: index,
      })),
    }

    const result =
      isEdit && id ? await ratingRepository.updateRating(id, request) : await ratingRepository.createRating(clubId!, request)

    if (result.kind === 'success') {
      navigate(`/ratings/${result.data.id}`)
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
        <h1 className="text-lg font-medium">{isEdit ? 'Редактирование рейтинга' : 'Новый рейтинг'}</h1>
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

        <h2 className="text-base font-medium text-fg">Группы зачёта</h2>
        {groups.map((draft) => (
          <RatingGroupEditor
            key={draft.localId}
            draft={draft}
            onChange={(updated) => setGroups(groups.map((g) => (g.localId === draft.localId ? updated : g)))}
            onRemove={() => setGroups(groups.filter((g) => g.localId !== draft.localId))}
          />
        ))}
        <button type="button" onClick={addGroup} className="self-start rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
          + Добавить группу
        </button>

        {error && <ErrorMessage message={error} />}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
