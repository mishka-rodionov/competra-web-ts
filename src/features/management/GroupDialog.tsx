import { useState } from 'react'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LabeledSelect } from '../../components/LabeledSelect'
import { parseGroupTitle, type GroupTitleInfo } from '../../lib/standardGroups'
import { GENDER_OPTIONS } from './dictionaries'
import { NO_DISTANCE_KEY, type PendingGroup } from './types'

interface GroupDialogProps {
  /** Пары [ключ дистанции, название]. */
  distanceOptions: [string, string][]
  isScoreO: boolean
  /** КВ соревнования — подсказка о том, что унаследует группа с пустым полем. */
  competitionControlTimeMinutes: number | null
  /** N командного зачёта соревнования; null — зачёт не включён, поле группы скрыто. */
  competitionTeamCounted?: number | null
  /** Группа для правки; не задана — создаётся новая. */
  initial?: PendingGroup
  onDismiss: () => void
  onSave: (group: PendingGroup) => void
}

function numStr(value: number | null | undefined): string {
  return value != null ? String(value) : ''
}

export function GroupDialog({
  distanceOptions,
  isScoreO,
  competitionControlTimeMinutes,
  competitionTeamCounted = null,
  initial,
  onDismiss,
  onSave,
}: GroupDialogProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [minAge, setMinAge] = useState(numStr(initial?.minAge))
  const [maxAge, setMaxAge] = useState(numStr(initial?.maxAge))
  const [maxParticipants, setMaxParticipants] = useState(numStr(initial?.maxParticipants))
  const [distanceKey, setDistanceKey] = useState(initial?.distanceKey ?? distanceOptions[0]?.[0] ?? NO_DISTANCE_KEY)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(numStr(initial?.timeLimitMinutes))
  const [scorePenaltyPerMinute, setScorePenaltyPerMinute] = useState(initial ? numStr(initial.scorePenaltyPerMinute) : '1')
  const [maxLatenessMinutes, setMaxLatenessMinutes] = useState(initial ? numStr(initial.maxLatenessMinutes) : '30')
  const [teamCountedResults, setTeamCountedResults] = useState(numStr(initial?.teamCountedResults))
  const [error, setError] = useState<string | null>(null)
  // Последние пол/возраст, подставленные по названию: поле, которое организатор поменял сам, не перетираем.
  const [autoFilled, setAutoFilled] = useState<GroupTitleInfo | null>(null)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (initial) return
    const info = parseGroupTitle(value)
    if (minAge === numStr(autoFilled?.minAge)) setMinAge(numStr(info?.minAge))
    if (maxAge === numStr(autoFilled?.maxAge)) setMaxAge(numStr(info?.maxAge))
    if (gender === (autoFilled?.gender ?? '')) setGender(info?.gender ?? '')
    setAutoFilled(info)
  }

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
      distanceKey,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes, 10) : null,
      scorePenaltyPerMinute: isScoreO && scorePenaltyPerMinute ? parseInt(scorePenaltyPerMinute, 10) : null,
      maxLatenessMinutes: isScoreO && maxLatenessMinutes ? parseInt(maxLatenessMinutes, 10) : null,
      teamCountedResults: parseInt(teamCountedResults, 10) || null,
    })
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">{initial ? 'Изменить группу' : 'Новая группа'}</h3>
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
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
        {competitionTeamCounted != null && (
          <label className="flex flex-col gap-1">
            <input
              value={teamCountedResults}
              onChange={(e) => setTeamCountedResults(e.target.value.replace(/\D/g, ''))}
              placeholder="Участников в командный зачёт"
              inputMode="numeric"
              className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
            />
            <span className="text-xs text-on-surface-variant">Пусто — как у соревнования: {competitionTeamCounted}</span>
          </label>
        )}
        {isScoreO && (
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
          <p className="text-sm text-on-surface-variant">
            Дистанций пока нет — группа будет без дистанции. Назначьте её позже на вкладке «Группы» соревнования.
          </p>
        ) : (
          <LabeledSelect
            label="Дистанция"
            value={distanceKey}
            options={[[NO_DISTANCE_KEY, 'Не назначена'], ...distanceOptions]}
            onChange={setDistanceKey}
          />
        )}
        {error && <ErrorMessage message={error} />}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {initial ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}
