import { useTheme } from './ThemeContext'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type='button'
      onClick={toggleTheme}
      aria-label='Toggle light and dark mode'
      className='theme-accent rounded-full px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap'
    >
      {isLight ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}