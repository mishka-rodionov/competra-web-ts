export function clubRoleLabel(role: string): string {
  switch (role) {
    case 'FOUNDER':
      return 'Основатель'
    case 'ADMIN':
      return 'Администратор'
    case 'MEMBER':
      return 'Участник'
    default:
      return role
  }
}

export function teamRoleLabel(role: string): string {
  switch (role) {
    case 'CAPTAIN':
      return 'Капитан'
    case 'MEMBER':
      return 'Участник'
    default:
      return role
  }
}

export function joinRequestStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'На рассмотрении'
    case 'APPROVED':
      return 'Одобрена'
    case 'REJECTED':
      return 'Отклонена'
    default:
      return status
  }
}

export function joinRequestStatusColorClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'text-primary'
    case 'REJECTED':
      return 'text-error'
    default:
      return 'text-on-surface-variant'
  }
}
