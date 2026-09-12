import { tokenStorage } from '../auth/tokenStorage'
import { authRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'

interface AuthResponseToken {
  accessToken: string
  refreshToken: string
}

interface AuthResponse {
  token: AuthResponseToken
}

/**
 * Ходит через authRequest, как и старый AuthRepository (там тоже завязан на authClient
 * целиком) — до логина токена ещё нет, поэтому запрос уходит анонимно, разницы с
 * publicRequest в этом случае нет.
 */
export const authRepository = {
  sendCode(email: string) {
    return safeApiCallUnit(() =>
      authRequest('/user/login', { method: 'POST', body: JSON.stringify({ email }) }),
    )
  },

  async verifyCode(email: string, code: string) {
    const result = await safeApiCall(() =>
      authRequest<AuthResponse>('/user/verify_code', { method: 'POST', body: JSON.stringify({ email, code }) }),
    )
    if (result.kind === 'success') {
      tokenStorage.saveTokens(result.data.token.accessToken, result.data.token.refreshToken)
    }
    return result
  },

  logout() {
    tokenStorage.clearToken()
  },

  /** Необратимо удаляет аккаунт на бэкенде. Токен нужно очистить отдельно (logout) после успеха. */
  deleteAccount() {
    return safeApiCallUnit(() => authRequest('/user/me', { method: 'DELETE' }))
  },
}
