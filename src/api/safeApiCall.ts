import { DebugErrorReporter } from '../lib/debugErrorReporter'
import { HTTP_UNAUTHORIZED, UnauthorizedError, type ApiResult, type CommonModel } from './types'

/**
 * Оборачивает вызов API в ApiResult. Успех — только если status === 1 и result не пуст.
 * В отличие от Kotlin-версии, репортит сетевые ошибки в DebugErrorReporter здесь же
 * централизованно — конвенции CLAUDE.md о ручном report() в каждом catch-блоке это
 * покрывает для всех вызовов через этот хелпер; вручную репортить нужно только для
 * сетевых запросов в обход него (загрузка файлов и т.п.).
 */
export async function safeApiCall<T>(call: () => Promise<CommonModel<T>>): Promise<ApiResult<T>> {
  try {
    const response = await call()
    if (response.status === 1 && response.result != null) {
      return { kind: 'success', data: response.result }
    }
    const message = response.errors?.[0]?.message ?? 'Unknown error'
    DebugErrorReporter.report(message)
    return { kind: 'error', message, code: response.errors?.[0]?.code }
  } catch (e) {
    return handleError(e)
  }
}

/** Для эндпоинтов, возвращающих {"status":1} без тела result. */
export async function safeApiCallUnit(call: () => Promise<CommonModel<unknown>>): Promise<ApiResult<void>> {
  try {
    const response = await call()
    if (response.status === 1) return { kind: 'success', data: undefined }
    const message = response.errors?.[0]?.message ?? 'Unknown error'
    DebugErrorReporter.report(message)
    return { kind: 'error', message, code: response.errors?.[0]?.code }
  } catch (e) {
    return handleError(e)
  }
}

function handleError(e: unknown): { kind: 'error'; message: string; code?: number } {
  if (e instanceof UnauthorizedError) {
    return { kind: 'error', message: e.message, code: HTTP_UNAUTHORIZED }
  }
  const message = e instanceof Error ? e.message : 'Network error'
  DebugErrorReporter.report(message)
  return { kind: 'error', message }
}
