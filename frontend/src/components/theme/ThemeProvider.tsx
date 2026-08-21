import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'ultra'

const STORAGE_KEY = 'keep-coin-theme'

const ORDER: Theme[] = ['light', 'dark', 'ultra']

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'ultra') return saved
  } catch {
    /* ignore */
  }
  return 'light'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Глобальная тема (светлая/тёмная) с применением класса `dark` на <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    // Ultra — это тёмная тема с неоновыми акцентами, поэтому `dark` нужен всегда.
    root.classList.toggle('dark', theme !== 'light')
    root.classList.toggle('ultra', theme === 'ultra')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const cycleTheme = useCallback(
    () => setThemeState((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]),
    [],
  )

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}