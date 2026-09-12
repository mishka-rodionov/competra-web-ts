import { EmptyState } from '../../components/EmptyState'
import type { ClubMember } from '../../types/club'
import { clubRoleLabel } from './labels'

interface MembersTabProps {
  members: ClubMember[]
  isFounder: boolean
  currentUserId: string | null | undefined
  onRemove: (userId: string) => void
  onChangeRole: (userId: string, role: string) => void
}

/**
 * Действия founder'а показаны сразу кнопками, а не спрятаны в выпадающем меню (как в старом
 * приложении) — на десктопе/вебе это не загромождает карточку и не требует лишнего клика.
 */
export function MembersTab({ members, isFounder, currentUserId, onRemove, onChangeRole }: MembersTabProps) {
  if (members.length === 0) return <EmptyState text="Нет участников" />

  return (
    <div className="flex flex-col gap-2 p-4">
      {members.map((member) => {
        const canManage = isFounder && member.userId !== currentUserId
        return (
          <div key={member.id} className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-fg">{`${member.lastName} ${member.firstName}`.trim()}</span>
                <span className="text-sm text-primary">{clubRoleLabel(member.role)}</span>
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-3">
                {member.role === 'MEMBER' && (
                  <button type="button" onClick={() => onChangeRole(member.userId, 'ADMIN')} className="text-sm text-fg">
                    Назначить админом
                  </button>
                )}
                {member.role === 'ADMIN' && (
                  <button type="button" onClick={() => onChangeRole(member.userId, 'MEMBER')} className="text-sm text-fg">
                    Снять админа
                  </button>
                )}
                <button type="button" onClick={() => onChangeRole(member.userId, 'FOUNDER')} className="text-sm text-fg">
                  Передать роль основателя
                </button>
                <button type="button" onClick={() => onRemove(member.userId)} className="text-sm text-error">
                  Удалить из клуба
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
