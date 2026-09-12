export function ParticipantsProgress({ registered, max }: { registered: number; max: number }) {
  const fraction = max > 0 ? Math.min(Math.max(registered / max, 0), 1) : 0
  const isFull = registered >= max

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-on-surface-variant">Участников</span>
        <span className={isFull ? 'text-error' : 'text-fg'}>
          {registered} из {max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
        <div className={`h-full rounded-full ${isFull ? 'bg-error' : 'bg-primary'}`} style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  )
}
