const ACCESS_KEY = 'competra_access_token'
const REFRESH_KEY = 'competra_refresh_token'

/**
 * Хранилище токенов в localStorage. Ключи совпадают со старым (Kotlin) репозиторием
 * намеренно — после cutover домена на competra.ru пользователи не будут разлогинены.
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
  },
  clearToken(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  isLoggedIn(): boolean {
    return this.getToken() != null
  },
}
