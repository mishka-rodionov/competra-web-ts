import { useSyncExternalStore } from 'react'
import { tokenStorage } from './tokenStorage'

export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(tokenStorage.subscribe, () => tokenStorage.isLoggedIn())
}
