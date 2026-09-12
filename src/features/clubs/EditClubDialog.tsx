import { useState } from 'react'
import { clubRepository } from '../../api/clubRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { Club } from '../../types/club'

interface EditClubDialogProps {
  club: Club
  onDismiss: () => void
  onSaved: (club: Club) => void
}

export function EditClubDialog({ club, onDismiss, onSaved }: EditClubDialogProps) {
  const [name, setName] = useState(club.name)
  const [description, setDescription] = useState(club.description ?? '')
  const [allowJoinRequests, setAllowJoinRequests] = useState(club.allowJoinRequests)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('Укажите название')
      return
    }
    setSaving(true)
    setError(null)
    const result = await clubRepository.updateClub(club.id, {
      name: name.trim(),
      description: description.trim() || null,
      allowJoinRequests,
    })
    if (result.kind === 'success') {
      onSaved(result.data)
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Редактирование клуба</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание"
          rows={3}
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowJoinRequests} onChange={(e) => setAllowJoinRequests(e.target.checked)} />
          <span className="text-sm text-fg">Разрешить заявки на вступление</span>
        </label>
        {error && <ErrorMessage message={error} />}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} disabled={saving} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50">
            Отмена
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
