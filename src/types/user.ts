/** Пол пользователя — значения как в Gender бэкенда (Gson @SerializedName). */
export type Gender = 'male' | 'female'

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  avatarUrl: string | null
  birthDate: number | null
  gender: Gender | null
  phoneNumber: string | null
}
