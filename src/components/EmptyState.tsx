export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-base text-on-surface-variant">{text}</p>
    </div>
  )
}
