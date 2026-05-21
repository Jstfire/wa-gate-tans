import {
  createContext,
  createSignal,
  onMount,
  useContext
  
} from 'solid-js'
import type {ParentComponent} from 'solid-js';

type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: () => Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>()

const THEME_KEY = 'wa-gate-theme'

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setThemeSignal] = createSignal<Theme>('light')

  const applyTheme = (t: Theme) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const setTheme = (t: Theme) => {
    setThemeSignal(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }

  const toggleTheme = () => {
    setTheme(theme() === 'dark' ? 'light' : 'dark')
  }

  onMount(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    const initial = stored ?? 'light'
    setThemeSignal(initial)
    applyTheme(initial)
  })

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
  }

  return (
    <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
