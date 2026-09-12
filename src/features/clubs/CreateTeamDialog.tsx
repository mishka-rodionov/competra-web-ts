import { useState } from 'react'
import { LabeledSelect } from '../../components/LabeledSelect'
import { SPORT_TYPES } from '../competitions/labels'

interface CreateTeamDialogProps {
  onDismiss: () => void
  onCreate: (name: string, sportType: string) => void
}

export function CreateTeamDialog({ onDismiss, onCreate }: CreateTeamDialogProps) {
  const [name, setName] = useState('')
  const [sportType, setSportType] = useState(SPORT_TYPES[0][0])

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Новая команда</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <LabeledSelect label="Вид спорта" value={sportType} options={SPORT_TYPES} onChange={setSportType} />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => name.trim() && onCreate(name.trim(), sportType)}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  )
}
