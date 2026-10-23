import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import boyBg from '../assets/boy.png'
import { ChevronDown } from 'lucide-react'
import { Signout } from './Signout'
import { ThemeToggle } from '../user/theme_color/ThemeToggle'

export const Navbar = () => {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  const itemClass = 'text-left text-xs px-4 py-2 theme-hover w-full'

  return (
    <div className='fixed top-0 left-0 right-0 h-16 z-50 flex flex-col w-full theme-gradient'>
      <div className='navbar h-16 border-b theme-border flex flex-row justify-between items-center p-3'>
        <span className='font-bold flex flex-row gap-2 text-lg pl-7 theme-text sm:pl-13'>
          Pikol <h1 className='theme-text opacity-80'>league</h1>
        </span>

        <div className='relative flex flex-row gap-3 items-center'>
          {/* Theme toggle button */}
          <ThemeToggle />

          <div
            onClick={() => go('/dashboard/hero')}
            className='flex items-center justify-center w-10 h-10 rounded-full border theme-border theme-card overflow-hidden cursor-pointer hover:opacity-80 transition-opacity'
          >
            {/* <img src={boyBg} alt='Profile' className='w-full h-full object-cover' /> */}
          </div>

          <button
            type='button'
            aria-label='Toggle menu'
            onClick={() => setShowDropdown((prev) => !prev)}
            className='theme-text'
          >
            <ChevronDown />
          </button>

          {showDropdown && (
            <div className='absolute right-0 top-full mt-2 w-40 border theme-border rounded-md shadow-md z-50'>
              <div className='flex flex-col'>
                <button
                  type='button'
                  onClick={() => go('/dashboard/hero')}
                  className={`${itemClass} rounded-t-md border-b theme-border theme-card  theme-hover `}
                >
                  Profile
                </button>
                <button
                  type='button'
                  onClick={() => go('/dashboard/support')}
                  className={`${itemClass} border-b theme-border theme-card  theme-hover `}
                >
                  Support
                </button>
                <button
                  type='button'
                  onClick={() => go('/dashboard/settings')}
                  className={`${itemClass} border-b theme-border theme-card  theme-hover `}
                >
                  Settings
                </button>
                <Signout className={`${itemClass} rounded-b-md theme-border theme-card  theme-hover `} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}