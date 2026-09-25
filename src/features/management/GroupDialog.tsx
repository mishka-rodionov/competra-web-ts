import { useState } from 'react'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LabeledSelect } from '../../components/LabeledSelect'
import { GENDER_OPTIONS } from './dictionaries'
import type { PendingGroup } from './types'

interface GroupDialogProps {
  distanceOptions: [number, string][]
  isByChoice: boolean
  /** КВ соревнования — подсказка о том, что унаследует группа с пустым полем. */
  competitionControlTimeMinutes: number | null
  onDismiss: () => void
  onSave: (group: PendingGroup) => void
}

export function GroupDialog({
  distanceOptions,
  isByChoice,
  competitionControlTimeMinutes,
  onDismiss,
  onSave,
}: GroupDialogProps) {
  const [title, setTitle] = useState('')
  const [gender, setGender] = useState('')
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [distanceIndex, setDistanceIndex] = useState(distanceOptions[0]?.[0] ?? 0)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
  const [scorePenaltyPerMinute, setScorePenaltyPerMinute] = useState('1')
  const [maxLatenessMinutes, setMaxLatenessMinutes] = useState('30')
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!title.trim()) {
      setError('Укажите название')
      return
    }
    onSave({
      title: title.trim(),
      gender: gender || null,
      minAge: minAge ? parseInt(minAge, 10) : null,
      maxAge: maxAge ? parseInt(maxAge, 10) : null,
      maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      distanceIndex,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes, 10) : null,
      scorePenaltyPerMinute: isByChoice && scorePenaltyPerMinute ? parseInt(scorePenaltyPerMinute, 10) : null,
      maxLatenessMinutes: isByChoice && maxLatenessMinutes ? parseInt(maxLatenessMinutes, 10) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Новая группа</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название * (М21, Ж18, Open)"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <LabeledSelect label="Пол" value={gender} options={GENDER_OPTIONS} onChange={setGender} />
        <div className="flex gap-2">
          <input
            value={minAge}
            onChange={(e) => setMinAge(e.target.value.replace(/\D/g, ''))}
            placeholder="Мин. возраст"
            inputMode="numeric"
            className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
          />
          <input
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value.replace(/\D/g, ''))}
            placeholder="Макс. возраст"
            inputMode="numeric"
            className="w-1/2 rounded-md border border-outline bg-bg px-3 py-2 text-fg"
          />
        </div>
        <input
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value.replace(/\D/g, ''))}
          placeholder="Лимит участников"
          inputMode="numeric"
          className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
        />
        <label className="flex flex-col gap-1">
          <input
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value.replace(/\D/g, ''))}
            placeholder="Контрольное время, мин"
            inputMode="numeric"
            className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
          />
          <span className="text-xs text-on-surface-variant">
            {competitionControlTimeMinutes != null
              ? `Пусто — как у соревнования: ${competitionControlTimeMinutes} мин`
              : 'Пусто — без КВ для этой группы'}
          </span>
        </label>
        {isByChoice && (
          <>
            <p className="text-sm font-medium text-fg">Параметры «по выбору»</p>
            <input
              value={scorePenaltyPerMinute}
              onChange={(e) => setScorePenaltyPerMinute(e.target.value.replace(/\D/g, ''))}
              placeholder="Штраф, очк/мин"
              inputMode="numeric"
              className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
            />
            <input
              value={maxLatenessMinutes}
              onChange={(e) => setMaxLatenessMinutes(e.target.value.replace(/\D/g, ''))}
              placeholder="Порог обнуления, мин"
              inputMode="numeric"
              className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
            />
          </>
        )}
        {distanceOptions.length === 0 ? (
          <p className="text-sm text-error">Сначала добавьте дистанцию</p>
        ) : (
          <LabeledSelect label="Дистанция *" value={distanceIndex} options={distanceOptions} onChange={setDistanceIndex} />
        )}
        {error && <ErrorMessage message={error} />}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={distanceOptions.length === 0}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
