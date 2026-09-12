interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  multiline?: boolean
  required?: boolean
}

export function TextInput({ label, value, onChange, placeholder, type = 'text', multiline, required }: TextInputProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-variant">
        {label}
        {required && ' *'}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
        />
      )}
    </label>
  )
}
