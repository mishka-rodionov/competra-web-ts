import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../../components/ErrorMessage'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents, type RegistrationTeamSource } from '../../lib/analytics/events'
import {
  COMMAND_NAME_MAX_LENGTH,
  normalizeCommandName,
  ownOptionFor,
  suggestionsFor,
  teamSourceFor,
} from '../../lib/registrationTeam'
import type { ParticipantGroupDetail, RegisterEventRequest } from '../../types/competition'
import { useUserProfile } from '../profile/hooks'
import { useClubMatches, useRegistrationTeamOptions } from './hooks'

interface RegistrationDialogProps {
  group: ParticipantGroupDetail
  competitionId: string
  onDismiss: () => void
  onConfirm: (request: RegisterEventRequest, teamSource: RegistrationTeamSource) => void
}

/** Пауза после последнего ввода перед поиском клуба по названию. */
const CLUB_MATCH_DEBOUNCE_MS = 500
/** Короче — клуб не ищем: слишком много случайных совпадений. */
const CLUB_MATCH_MIN_LENGTH = 2

/** Данные из профиля подставляются автоматически; поля показываем только если профиль их не заполнил. */
export function RegistrationDialog({ group, competitionId, onDismiss, onConfirm }: RegistrationDialogProps) {
  const { data: profile, isLoading: isProfileLoading } = useUserProfile()
  const hasProfileName = !!profile?.firstName?.trim() && !!profile?.lastName?.trim()
  // Поля ввода нужны только когда в профиле нет имени — их state не зависит от профиля,
  // иначе при первом открытии (профиль ещё грузится) он застывал бы пустым.
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: teamOptions } = useRegistrationTeamOptions(competitionId)
  // Пока пользователь не трогал поле, в нём подсказка сервера (своя команда, прошлый выбор);
  // после первого ввода — только то, что ввёл он сам, даже если подсказки догрузились позже.
  const [editedCommandName, setEditedCommandName] = useState<string | null>(null)
  const commandName = editedCommandName ?? teamOptions?.suggestedCommandName ?? ''
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const suggestions = suggestionsFor(teamOptions, commandName)
  const selectedOption = ownOptionFor(teamOptions, commandName)

  const normalized = normalizeCommandName(commandName)
  const matchName = normalized && normalized.length >= CLUB_MATCH_MIN_LENGTH && !selectedOption ? normalized : null
  const [debouncedMatchName, setDebouncedMatchName] = useState<string | null>(null)
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedMatchName(matchName), CLUB_MATCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [matchName])
  const { data: clubMatches } = useClubMatches(debouncedMatchName)
  const clubMatch = debouncedMatchName === matchName ? clubMatches?.[0] : undefined

  function handleConfirm() {
    const first = (hasProfileName ? profile!.firstName : firstName).trim()
    const last = (hasProfileName ? profile!.lastName : lastName).trim()
    if (!first || !last) {
      setError('Заполните имя и фамилию')
      return
    }
    onConfirm(
      {
        competitionId,
        groupId: group.groupId,
        firstName: first,
        lastName: last,
        commandName: normalized,
        teamId: selectedOption?.teamId ?? null,
      },
      teamSourceFor(teamOptions, commandName),
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="w-full max-w-sm rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Регистрация: {group.title}</h3>
        <div className="mt-3 flex flex-col gap-2">
          {isProfileLoading ? (
            <span className="text-sm text-on-surface-variant">Загрузка профиля…</span>
          ) : hasProfileName ? (
            <>
              <span className="text-sm text-on-surface-variant">Регистрация от имени:</span>
              <span className="text-base text-fg">
                {profile!.lastName} {profile!.firstName}
              </span>
            </>
          ) : (
            <>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
              />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
                className="rounded-md border border-outline bg-bg px-3 py-2 text-fg"
              />
            </>
          )}

          <div className="relative mt-1">
            <input
              value={commandName}
              onChange={(e) => {
                setEditedCommandName(e.target.value)
                setSuggestionsOpen(true)
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => setSuggestionsOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSuggestionsOpen(false)
              }}
              maxLength={COMMAND_NAME_MAX_LENGTH}
              placeholder="Клуб/команда (необязательно)"
              aria-label="Клуб/команда"
              role="combobox"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="registration-team-suggestions"
              aria-autocomplete="list"
              className="w-full rounded-md border border-outline bg-bg px-3 py-2 text-fg"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <ul
                id="registration-team-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-outline-variant bg-surface shadow-lg"
              >
                {suggestions.map((suggestion) => (
                  <li
                    key={`${suggestion.kind}:${suggestion.label}`}
                    role="option"
                    aria-selected={false}
                    // mousedown, а не click: иначе blur инпута закроет список раньше выбора.
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setEditedCommandName(suggestion.label)
                      setSuggestionsOpen(false)
                    }}
                    className="cursor-pointer px-3 py-2 hover:bg-surface-variant"
                  >
                    <div className="text-sm text-fg">{suggestion.label}</div>
                    <div className="text-xs text-on-surface-variant">
                      {suggestion.kind === 'own'
                        ? suggestion.option.teamId
                          ? 'Ваша команда'
                          : 'Ваш клуб'
                        : 'Уже есть в протоколе'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedOption && (
            <span className="text-xs text-on-surface-variant">
              {selectedOption.teamId ? 'Команда вашего клуба' : 'Ваш клуб'}
            </span>
          )}
          {clubMatch && (
            <div className="flex items-center gap-2 rounded-md bg-secondary-container px-3 py-2 text-on-secondary-container">
              <span className="flex-1 text-xs">
                {clubMatch.allowJoinRequests
                  ? `Клуб «${clubMatch.name}» есть в Competra — можно подать заявку на вступление`
                  : `Клуб «${clubMatch.name}» есть в Competra`}
              </span>
              <Link
                to={`/clubs/${clubMatch.id}`}
                onClick={() => analytics.trackEvent(AnalyticsEvents.clubJoinHintClicked(clubMatch.id))}
                className="text-sm font-medium text-primary"
              >
                Открыть
              </Link>
            </div>
          )}
          {error && <ErrorMessage message={error} />}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProfileLoading}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  )
}
