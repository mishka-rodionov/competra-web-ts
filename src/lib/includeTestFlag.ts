export const INCLUDE_TEST_PARAM = 'includeTest'

/** `1`/`true` — включить, `0`/`false` — выключить, иначе `null` (параметра нет или мусор). */
export function parseIncludeTestParam(value: string | null): boolean | null {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return null
}

/**
 * Показ тестовых соревнований (`isTest`) в публичной ленте — веб-аналог debug-переключателя
 * «Показывать тестовые» из фильтра competra-android. Включается вручную параметром в адресе
 * `?includeTest=1` (или `true`), выключается `?includeTest=0`. Флаг переживает перезагрузку через
 * localStorage. Здесь читается параметр до `#` (`competra.ru/?includeTest=1`) — он есть только
 * при полной загрузке страницы, поэтому после чтения убирается из адреса; параметр внутри
 * хэш-маршрута (`competra.ru/#/?includeTest=1`) обрабатывает сама страница через роутер.
 */
export function readIncludeTestFlag(): boolean {
  try {
    const params = new URLSearchParams(location.search)
    const fromUrl = parseIncludeTestParam(params.get(INCLUDE_TEST_PARAM))
    if (fromUrl != null) {
      setIncludeTestFlag(fromUrl)
      params.delete(INCLUDE_TEST_PARAM)
      const search = params.toString()
      history.replaceState(
        history.state,
        '',
        `${location.pathname}${search ? `?${search}` : ''}${location.hash}`,
      )
    }
    return localStorage.getItem(INCLUDE_TEST_PARAM) === '1'
  } catch {
    return false
  }
}

export function setIncludeTestFlag(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(INCLUDE_TEST_PARAM, '1')
    else localStorage.removeItem(INCLUDE_TEST_PARAM)
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — флаг просто не запомнится
  }
}
