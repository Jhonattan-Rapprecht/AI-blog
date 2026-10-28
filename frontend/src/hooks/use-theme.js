import { useEffect, useSyncExternalStore } from 'react'

const THEME_KEY = 'theme'
const THEME_CHANGE_EVENT = 'blogstudio:theme-change'

const readTheme = () => {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem(THEME_KEY) || 'dark'
}

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

const subscribe = (onStoreChange) => {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event) => {
    if (event.key === THEME_KEY) onStoreChange()
  }
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStorage)
  }
}

const setSharedTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark')

  useEffect(() => { applyTheme(theme) }, [theme])

  return { theme, toggle: () => setSharedTheme(theme === 'dark' ? 'light' : 'dark') }
}
