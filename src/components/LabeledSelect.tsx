interface LabeledSelectProps<T extends string | number> {
  label: string
  value: T
  options: [T, string][]
  onChange: (value: T) => void
}

export function LabeledSelect<T extends string | number>({ label, value, options, onChange }: LabeledSelectProps<T>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <select
        value={String(value)}
        onChange={(e) => {
          const match = options.find(([key]) => String(key) === e.target.value)
          if (match) onChange(match[0])
        }}
        className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
      >
        {options.map(([key, text]) => (
          <option key={String(key)} value={String(key)}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}
