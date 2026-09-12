export interface Club {
  id: string
  name: string
  description: string | null
  allowJoinRequests: boolean
  foundedAt: number
  membersCount: number
  updatedAt: number
}

export interface ClubMember {
  id: string
  clubId: string
  userId: string
  firstName: string
  lastName: string
  role: string
  joinedAt: number
}

export interface ClubJoinRequest {
  id: string
  clubId: string
  userId: string
  firstName: string
  lastName: string
  status: string
  createdAt: number
}

export interface CreateClubRequest {
  name: string
  description: string | null
  allowJoinRequests: boolean
}

export interface UpdateClubRequest {
  name: string
  description: string | null
  allowJoinRequests: boolean
}

/** role: "ADMIN" | "MEMBER" | "FOUNDER" (передача роли основателя). */
export interface ChangeRoleRequest {
  role: string
}
