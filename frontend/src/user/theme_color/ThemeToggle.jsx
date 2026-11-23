
import { useTheme } from './ThemeContext'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'


  // still need to make shadow ligh in the button toogle
  
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      aria-pressed={!isLight}
      className="relative flex h-8 w-14 items-center rounded-full px-1 theme-gradient theme-border transition-colors duration-300"
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full theme-border shadow-md transition-transform duration-300 ${
          isLight ? 'translate-x-0' : 'translate-x-6'
        }`}
      >
        <img
          src={
            isLight
              ? 'https://img.icons8.com/?size=100&id=116896&format=png&color=000000'
              : 'https://img.icons8.com/?size=100&id=8LM7-CYX4BPD&format=png&color=000000'
          }
          alt={isLight ? 'Sun' : 'Moon'}
          className="h-4 w-4 object-contain"
        />
      </span>
    </button>
  )
}
