import { tokenStorage } from '../auth/tokenStorage'
import type { CommonModel } from './types'
import { UnauthorizedError } from './types'

export const BASE_URL = 'https://api.competra.ru/api'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface RefreshResult {
  token: AuthTokens
}

/**
 * accessToken живёт 1 час; refreshToken — 30 дней, одноразовый, ротируется на каждый
 * рефреш. При параллельных 401 от нескольких запросов рефреш должен выполниться один раз —
 * см. refreshPromise ниже (аналог Ktor Auth-плагина в старом ApiClient.kt).
 */
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    tokenStorage.clearToken()
    return null
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/refresh_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!response.ok) throw new Error('refresh failed')

        const body = (await response.json()) as CommonModel<RefreshResult>
        const tokens = body.status === 1 ? body.result?.token : null
        if (!tokens) throw new Error('refresh failed')

        tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken)
        return tokens.accessToken
      } catch {
        tokenStorage.clearToken()
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

interface RequestOptions extends RequestInit {
  auth?: boolean
}

async function performFetch(path: string, options: RequestOptions): Promise<Response> {
  const { auth = false, headers, ...rest } = options
  const finalHeaders = new Headers(headers)
  // FormData (загрузка XML/файлов) должна сама выставить Content-Type с boundary —
  // раз проставленный тут application/json это сломает.
  if (!finalHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
    finalHeaders.set('Content-Type', 'application/json')
  }
  if (auth) {
    const token = tokenStorage.getToken()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders })
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<CommonModel<T>> {
  let response = await performFetch(path, options)

  if (options.auth && response.status === 401) {
    const newToken = await refreshAccessToken()
    if (!newToken) throw new UnauthorizedError()
    response = await performFetch(path, options)
    if (response.status === 401) throw new UnauthorizedError()
  }

  return response.json() as Promise<CommonModel<T>>
}

/** Запрос без авторизации — для публичных эндпоинтов. */
export function publicRequest<T>(path: string, options: RequestInit = {}): Promise<CommonModel<T>> {
  return request<T>(path, { ...options, auth: false })
}

/** Запрос с Bearer-токеном — для авторизованных эндпоинтов, с авто-рефрешем при 401. */
export function authRequest<T>(path: string, options: RequestInit = {}): Promise<CommonModel<T>> {
  return request<T>(path, { ...options, auth: true })
}
