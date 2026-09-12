const ACCESS_KEY = 'competra_access_token'
const REFRESH_KEY = 'competra_refresh_token'

const listeners = new Set<() => void>()
function emit() {
  for (const listener of listeners) listener()
}

/**
 * Хранилище токенов в localStorage. Ключи совпадают со старым (Kotlin) репозиторием
 * намеренно — после cutover домена на competra.ru пользователи не будут разлогинены.
 * saveTokens/clearToken оповещают подписчиков (см. useIsLoggedIn) — реактивность нужна,
 * чтобы UI (таб «Мои», профиль) обновлялся сразу после логина/логаута/авто-рефреша токена,
 * а не только после перезагрузки страницы.
 */
export const tokenStorage = {
  getToken(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    emit()
  },
  clearToken(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    emit()
  },
  isLoggedIn(): boolean {
    return this.getToken() != null
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
