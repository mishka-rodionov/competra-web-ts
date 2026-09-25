import { authRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { ApiResult } from './types'
import type { Gender, UserProfile } from '../types/user'

/**
 * Реальный ответ /user/profile — snake_case, в отличие от event/orienteering/* (camelCase).
 * Старая Kotlin-модель объявляла @SerialName в camelCase, из-за чего firstName/lastName молча
 * не парсились и падали на дефолт "" (kotlinx.serialization, ignoreUnknownKeys=true) — баг был
 * там же, просто незаметный. В JS без дефолтов это бы дало буквальный "undefined" в UI, поэтому
 * здесь сразу нормализуем к чистой camelCase-модели на границе.
 */
interface RawUserProfile {
  id: string
  first_name: string
  last_name: string
  middle_name: string
  email: string
  avatar_url: string
  birth_date: number | string
  gender: string
  phone_number: string
}

function parseBirthDate(raw: number | string): number | null {
  if (typeof raw === 'number') return raw
  if (raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseGender(raw: string): Gender | null {
  return raw === 'male' || raw === 'female' ? raw : null
}

function mapUserProfile(raw: RawUserProfile): UserProfile {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    middleName: raw.middle_name || null,
    email: raw.email,
    avatarUrl: raw.avatar_url || null,
    birthDate: parseBirthDate(raw.birth_date),
    gender: parseGender(raw.gender),
    phoneNumber: raw.phone_number || null,
  }
}

/** Тело PATCH-запроса на обновление профиля — сервер меняет только переданные поля. snake_case, как и ответ /user/profile. */
export interface UserProfileUpdateRequest {
  first_name?: string | null
  last_name?: string | null
  middle_name?: string | null
  birth_date?: number | null
  avatar_url?: string | null
  gender?: Gender | null
}

export const userRepository = {
  async getUserProfile(): Promise<ApiResult<UserProfile>> {
    const result = await safeApiCall(() => authRequest<RawUserProfile>('/user/profile'))
    if (result.kind === 'error') return result
    return { kind: 'success', data: mapUserProfile(result.data) }
  },

  async updateProfile(request: UserProfileUpdateRequest): Promise<ApiResult<UserProfile>> {
    const result = await safeApiCall(() =>
      authRequest<RawUserProfile>('/user/profile', { method: 'PATCH', body: JSON.stringify(request) }),
    )
    if (result.kind === 'error') return result
    return { kind: 'success', data: mapUserProfile(result.data) }
  },
}
