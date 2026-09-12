import { publicRequest } from './client'
import { safeApiCall } from './safeApiCall'
import type { Club } from '../types/club'

export const clubRepository = {
  getClub(id: string) {
    return safeApiCall(() => publicRequest<Club>(`/clubs/${id}`))
  },
}
