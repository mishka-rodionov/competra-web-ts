import type { RegistrationTeamSource } from './analytics/events'
import type { RegistrationTeamOption, RegistrationTeamOptions } from '../types/competition'

/**
 * Поле «Команда» при регистрации на соревнование — зеркало
 * domain/models/cyclic_event/RegistrationTeam.kt из competra-android.
 */

/** Максимальная длина подписи команды (ограничение колонки на сервере). */
export const COMMAND_NAME_MAX_LENGTH = 200

/** Подпись без крайних и повторных пробелов; пустая строка → null. */
export function normalizeCommandName(raw: string | null | undefined): string | null {
  const normalized = raw?.trim().replace(/\s+/g, ' ') ?? ''
  return normalized === '' ? null : normalized
}

/** true, если подписи совпадают с точностью до регистра и пробелов. */
export function sameCommandName(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeCommandName(a)?.toLowerCase() === normalizeCommandName(b)?.toLowerCase()
}

/** Своя команда/клуб, чья подпись совпадает с [commandName], иначе null. */
export function ownOptionFor(options: RegistrationTeamOptions | undefined, commandName: string): RegistrationTeamOption | null {
  if (!options || normalizeCommandName(commandName) === null) return null
  return options.options.find((option) => sameCommandName(option.label, commandName)) ?? null
}

/** Источник подписи для аналитики `event_registered`. */
export function teamSourceFor(options: RegistrationTeamOptions | undefined, commandName: string): RegistrationTeamSource {
  if (normalizeCommandName(commandName) === null) return 'none'
  const own = ownOptionFor(options, commandName)
  if (own?.teamId) return 'club_team'
  if (own) return 'club'
  if (options?.protocolNames.some((name) => sameCommandName(name, commandName))) return 'protocol'
  return 'custom'
}

/** Элемент списка подсказок: своя команда/клуб или подпись из протокола. */
export type TeamSuggestion =
  | { kind: 'own'; label: string; option: RegistrationTeamOption }
  | { kind: 'protocol'; label: string }

/**
 * Подсказки под полем: сначала свои команды/клубы, затем подписи из протокола (без дублей своих).
 * Непустой запрос фильтрует по вхождению без учёта регистра; точное совпадение с полем скрывается.
 */
export function suggestionsFor(options: RegistrationTeamOptions | undefined, query: string, limit = 8): TeamSuggestion[] {
  if (!options) return []
  const own: TeamSuggestion[] = options.options.map((option) => ({ kind: 'own', label: option.label, option }))
  const protocol: TeamSuggestion[] = options.protocolNames
    .filter((name) => !options.options.some((option) => sameCommandName(option.label, name)))
    .map((label) => ({ kind: 'protocol', label }))
  const needle = normalizeCommandName(query)?.toLowerCase()
  return [...own, ...protocol]
    .filter((s) => !needle || s.label.toLowerCase().includes(needle))
    .filter((s) => !sameCommandName(s.label, query))
    .slice(0, limit)
}
