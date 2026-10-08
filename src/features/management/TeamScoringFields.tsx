import { useState } from 'react'
import { LabeledSelect } from '../../components/LabeledSelect'
import { DEFAULT_TEAM_SCORING, TEAM_OVERALL_SCOPES, TEAM_SCORING_METHOD_OPTIONS } from '../../lib/teamScoring'
import type { TeamScoring } from '../../types/teamStandings'

interface TeamScoringFieldsProps {
  value: TeamScoring | null
  /** score-О («по выбору» по баллам) — зачёт по времени недоступен. */
  isScoreO: boolean
  onChange: (value: TeamScoring | null) => void
}

/**
 * Командный зачёт соревнования (docs/specs/team-scoring.md в competra-android) — общий для мастера
 * создания и вкладки «Общее». Задаётся без ссылок на группы: зачёт в каждой группе (очки за места
 * или сумма времени N лучших) и общие зачёты по командным местам в группах.
 */
export function TeamScoringFields({ value, isScoreO, onChange }: TeamScoringFieldsProps) {
  // Локальный текст: поле можно очистить и ввести новое число; в настройки уходит только N > 0.
  const [countedText, setCountedText] = useState(String(value?.groupCountedResults ?? DEFAULT_TEAM_SCORING.groupCountedResults))
  const method = isScoreO ? 'POINTS' : (value?.groupMethod ?? 'POINTS')

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-base text-fg">Командный зачёт</span>
          <span className="text-sm text-on-surface-variant">Команда — подпись участника в протоколе</span>
        </span>
        <input
          type="checkbox"
          checked={value != null}
          onChange={(e) => {
            setCountedText(String(DEFAULT_TEAM_SCORING.groupCountedResults))
            onChange(e.target.checked ? DEFAULT_TEAM_SCORING : null)
          }}
        />
      </label>
      {value != null && (
        <>
          <label className="flex flex-col gap-1">
            <LabeledSelect
              label="Зачёт в каждой группе"
              value={method}
              options={isScoreO ? TEAM_SCORING_METHOD_OPTIONS.filter(([key]) => key === 'POINTS') : TEAM_SCORING_METHOD_OPTIONS}
              onChange={(groupMethod) => onChange({ ...value, groupMethod })}
            />
            <span className="text-xs text-on-surface-variant">
              {method === 'TIME'
                ? 'Складывается время лучших участников команды; если финишировало меньше — команда вне зачёта'
                : 'Очки за место по таблице рейтинга (1-е — 100, 2-е — 80, 3-е — 60…), у команды складываются лучшие'}
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Сколько участников в зачёт</span>
            <input
              value={countedText}
              onChange={(e) => {
                const text = e.target.value.replace(/\D/g, '')
                setCountedText(text)
                const counted = parseInt(text, 10)
                if (counted > 0) onChange({ ...value, groupCountedResults: counted })
              }}
              inputMode="numeric"
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
            <span className="text-xs text-on-surface-variant">Сколько лучших результатов команды в группе идёт в зачёт</span>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-on-surface-variant">Общие зачёты</span>
            <div className="flex flex-wrap gap-2">
              {TEAM_OVERALL_SCOPES.map(([scope, label]) => {
                const selected = value.overallScopes.includes(scope)
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        overallScopes: selected
                          ? value.overallScopes.filter((s) => s !== scope)
                          : TEAM_OVERALL_SCOPES.map(([key]) => key).filter((key) => key === scope || value.overallScopes.includes(key)),
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-sm ${
                      selected ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <span className="text-xs text-on-surface-variant">
              Сумма баллов за места команды в группах: 1-е место в группе — 100, 2-е — 80…
            </span>
          </div>
        </>
      )}
    </div>
  )
}
