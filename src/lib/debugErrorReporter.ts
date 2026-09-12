import { isDebugEnvironment } from './debugEnv'

export interface DebugErrorEntry {
  id: number
  message: string
}

const MAX_ENTRIES = 5

let nextId = 0
let entries: DebugErrorEntry[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/**
 * Копит сетевые (и прочие) ошибки для показа плашкой над таб-баром в debug-режиме,
 * вместо того чтобы они молча оседали в консоли. Портировано из
 * web/utils/DebugErrorReporter.kt — конвенция проекта (см. CLAUDE.md): любой сетевой
 * вызов в обход `safeApiCall`/`safeApiCallUnit` должен в catch-блоке звать `report(...)`
 * с коротким описанием запроса и что пошло не так. Вызовы через `safeApiCall` репортят
 * автоматически (см. api/safeApiCall.ts).
 */
export const DebugErrorReporter = {
  report(message: string) {
    if (!isDebugEnvironment()) return
    entries = [...entries, { id: nextId++, message }].slice(-MAX_ENTRIES)
    emit()
  },
  dismiss(id: number) {
    entries = entries.filter((entry) => entry.id !== id)
    emit()
  },
  getEntries(): DebugErrorEntry[] {
    return entries
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
