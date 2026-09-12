interface PagePlaceholderProps {
  title: string
  phase: string
}

/** Временная заглушка на время миграции — заменяется по мере готовности каждой вертикали. */
export function PagePlaceholder({ title, phase }: PagePlaceholderProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <h1 className="text-xl font-medium text-fg">{title}</h1>
      <p className="text-sm text-on-surface-variant">{phase}</p>
    </div>
  )
}
