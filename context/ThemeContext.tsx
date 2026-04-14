'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({
  theme: 'light',
  toggleTheme: () => {},
})

// Read theme synchronously from DOM (set by inline script in layout.tsx)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    // Sync state with DOM in case getInitialTheme ran before hydration
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    if (current !== theme) setTheme(current) // eslint-disable-line react-hooks/set-state-in-effect
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('agentrel_theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
