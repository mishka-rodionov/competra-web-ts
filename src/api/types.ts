export interface ApiError {
  code: number
  message: string
}

/** Обёртка всех ответов бэкенда. Успех определяется по status === 1, не по HTTP-коду. */
export interface CommonModel<T> {
  status: number
  result: T | null
  errors: ApiError[] | null
}

/** Страница списка с бэкенда: элементы + признак наличия следующей страницы. */
export interface PagedResponse<T> {
  items: T[]
  hasMore: boolean
}

export type ApiResult<T> = { kind: 'success'; data: T } | { kind: 'error'; message: string; code?: number }

export const HTTP_UNAUTHORIZED = 401

/** Бросается, когда сервер вернул 401 и обновить токен не удалось. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Сессия истекла, войдите снова')
    this.name = 'UnauthorizedError'
  }
}
