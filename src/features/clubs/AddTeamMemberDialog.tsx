import type { ClubMember } from '../../types/club'

interface AddTeamMemberDialogProps {
  candidates: ClubMember[]
  onDismiss: () => void
  onAdd: (clubMemberId: string) => void
}

export function AddTeamMemberDialog({ candidates, onDismiss, onAdd }: AddTeamMemberDialogProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-fg">Добавить участника</h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Все участники клуба уже в команде</p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant">
            {candidates.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => onAdd(member.id)}
                className="py-2 text-left text-base text-fg"
              >
                {`${member.lastName} ${member.firstName}`.trim()}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onDismiss} className="mt-2 rounded-md border border-outline px-4 py-2 text-sm text-fg">
          Закрыть
        </button>
      </div>
    </div>
  )
}
