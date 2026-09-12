export interface Team {
  id: string
  clubId: string
  name: string
  sportType: string
  membersCount: number
  updatedAt: number
}

export interface TeamMember {
  id: string
  teamId: string
  clubMemberId: string
  userId: string
  firstName: string
  lastName: string
  role: string
  joinedAt: number
}

export interface CreateTeamRequest {
  name: string
  sportType: string
}

export interface UpdateTeamRequest {
  name: string
  sportType: string
}

export interface AddTeamMemberRequest {
  clubMemberId: string
  role: string
}

/** role: "CAPTAIN" | "MEMBER" */
export interface ChangeTeamMemberRoleRequest {
  role: string
}
