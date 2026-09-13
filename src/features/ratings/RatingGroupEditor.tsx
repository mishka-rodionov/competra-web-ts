import { LabeledSelect } from '../../components/LabeledSelect'
import { RATING_GENDER_OPTIONS } from './labels'

export interface RatingGroupDraft {
  localId: number
  id: number | null
  title: string
  gender: string | null
  minAge: string
  maxAge: string
}

interface RatingGroupEditorProps {
  draft: RatingGroupDraft
  onChange: (draft: RatingGroupDraft) => void
  onRemove: () => void
}

export function RatingGroupEditor({ draft, onChange, onRemove }: RatingGroupEditorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
      <div className="flex items-center gap-2">
        <input
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="Название группы"
          className="flex-1 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <button type="button" onClick={onRemove} className="text-sm text-error">
          Удалить
        </button>
      </div>
      <LabeledSelect
        label="Пол"
        value={draft.gender ?? ''}
        options={RATING_GENDER_OPTIONS}
        onChange={(gender) => onChange({ ...draft, gender: gender || null })}
      />
      <div className="flex gap-2">
        <input
          value={draft.minAge}
          onChange={(e) => onChange({ ...draft, minAge: e.target.value.replace(/\D/g, '') })}
          placeholder="Мин. возраст"
          inputMode="numeric"
          className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <input
          value={draft.maxAge}
          onChange={(e) => onChange({ ...draft, maxAge: e.target.value.replace(/\D/g, '') })}
          placeholder="Макс. возраст"
          inputMode="numeric"
          className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
      </div>
    </div>
  )
}
