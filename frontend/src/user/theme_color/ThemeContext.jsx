import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem('theme', theme)
    } catch {}
  }, [theme])

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}