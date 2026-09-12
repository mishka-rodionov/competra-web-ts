import { useState } from 'react'
import { teamRepository } from '../../api/teamRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LabeledSelect } from '../../components/LabeledSelect'
import type { Team } from '../../types/team'
import { SPORT_TYPES } from '../competitions/labels'

interface EditTeamDialogProps {
  team: Team
  onDismiss: () => void
  onSaved: (team: Team) => void
}

export function EditTeamDialog({ team, onDismiss, onSaved }: EditTeamDialogProps) {
  const [name, setName] = useState(team.name)
  const [sportType, setSportType] = useState(team.sportType)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('Укажите название')
      return
    }
    setSaving(true)
    setError(null)
    const result = await teamRepository.updateTeam(team.id, { name: name.trim(), sportType })
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
        <h3 className="text-lg font-medium text-fg">Редактирование команды</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <LabeledSelect label="Вид спорта" value={sportType} options={SPORT_TYPES} onChange={setSportType} />
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
