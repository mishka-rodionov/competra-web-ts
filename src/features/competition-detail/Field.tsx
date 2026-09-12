export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-base text-fg">{value}</span>
    </div>
  )
}

export function LinkField({ label, value, url }: { label: string; value: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex flex-col gap-0.5">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-base text-primary underline">{value}</span>
    </a>
  )
}
