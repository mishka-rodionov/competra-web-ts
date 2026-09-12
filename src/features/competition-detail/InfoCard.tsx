import type { ReactNode } from 'react'

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-fg">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
