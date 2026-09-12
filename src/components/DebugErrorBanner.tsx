import { useSyncExternalStore } from 'react'
import { DebugErrorReporter } from '../lib/debugErrorReporter'

/**
 * Плашка над таб-баром с последними сетевыми/прочими ошибками — видна только
 * в debug-режиме (см. DebugErrorReporter). Подключается один раз в AppShell,
 * а не на каждой странице отдельно, как было в Compose-версии.
 */
export function DebugErrorBanner() {
  const entries = useSyncExternalStore(DebugErrorReporter.subscribe, DebugErrorReporter.getEntries)
  if (entries.length === 0) return null

  return (
    <div className="flex w-full flex-col bg-error/10">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between gap-2 px-3 py-1 text-sm text-error">
          <span className="flex-1">DEBUG: {entry.message}</span>
          <button
            type="button"
            onClick={() => DebugErrorReporter.dismiss(entry.id)}
            aria-label="Скрыть"
            className="shrink-0 text-error"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
