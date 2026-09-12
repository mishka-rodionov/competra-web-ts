const DEBUG_FLAG_KEY = 'debugTools'

/**
 * Debug-окружение: локальная разработка, либо `?debug=1` в URL (флаг переживает
 * навигацию через localStorage), либо ранее выставленный флаг.
 * Снять на деплое: `localStorage.removeItem('debugTools')` в консоли браузера.
 * Портировано из web/utils/DebugEnv.kt старого репозитория.
 */
export function isDebugEnvironment(): boolean {
  try {
    const host = location.hostname
    if (host === 'localhost' || host === '127.0.0.1') return true

    const params = new URLSearchParams(location.search)
    if (params.get('debug') === '1') {
      try {
        localStorage.setItem(DEBUG_FLAG_KEY, '1')
      } catch {
        // localStorage недоступен (приватный режим и т.п.) — не критично
      }
      return true
    }

    return localStorage.getItem(DEBUG_FLAG_KEY) === '1'
  } catch {
    return false
  }
}
