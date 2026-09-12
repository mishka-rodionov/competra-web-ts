import { authRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { ApiResult } from './types'
import type { UserProfile } from '../types/user'

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

function mapUserProfile(raw: RawUserProfile): UserProfile {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    middleName: raw.middle_name || null,
    email: raw.email,
    avatarUrl: raw.avatar_url || null,
    birthDate: typeof raw.birth_date === 'number' ? raw.birth_date : null,
    gender: raw.gender || null,
    phoneNumber: raw.phone_number || null,
  }
}

export const userRepository = {
  async getUserProfile(): Promise<ApiResult<UserProfile>> {
    const result = await safeApiCall(() => authRequest<RawUserProfile>('/user/profile'))
    if (result.kind === 'error') return result
    return { kind: 'success', data: mapUserProfile(result.data) }
  },
}
