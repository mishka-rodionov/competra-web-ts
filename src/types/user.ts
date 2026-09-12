export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  avatarUrl: string | null
  birthDate: number | null
  gender: string | null
  phoneNumber: string | null
}
