import { tokenStorage } from '../auth/tokenStorage'
import type { Gender } from '../types/user'
import { authRequest } from './client'
import { safeApiCall, safeApiCallUnit } from './safeApiCall'

interface AuthResponseToken {
  accessToken: string
  refreshToken: string
}

interface AuthResponse {
  token: AuthResponseToken
}

/** Код ошибки /user/login: пользователя с таким email нет (eSport Databases.kt). */
export const ERROR_USER_NOT_FOUND = 1004

export interface RegisterRequest {
  first_name: string
  last_name: string
  birth_date: number
  gender: Gender
  email: string
  privacy_accepted: boolean
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

  /**
   * Создаёт пользователя (ещё не в БД — только «временную» запись) и шлёт код на email,
   * как и sendCode. Реальная запись появляется на verify_code — см. eSport Databases.kt.
   */
  register(request: RegisterRequest) {
    return safeApiCallUnit(() =>
      authRequest('/user/register', { method: 'POST', body: JSON.stringify(request) }),
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
