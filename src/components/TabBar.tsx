export interface TabBarItem {
  key: string
  label: string
}

interface TabBarProps {
  tabs: TabBarItem[]
  active: string
  onChange: (key: string) => void
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex overflow-x-auto border-b border-outline-variant">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`shrink-0 border-b-2 px-4 py-2 text-sm ${
            active === tab.key
              ? 'border-primary font-medium text-primary'
              : 'border-transparent text-on-surface-variant'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
