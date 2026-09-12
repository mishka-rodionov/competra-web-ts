export interface Club {
  id: string
  name: string
  description: string | null
  allowJoinRequests: boolean
  foundedAt: number
  membersCount: number
  updatedAt: number
}
