import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Signout } from './Signout'
import { ThemeToggle } from '../user/theme_color/ThemeToggle'
import api from '../api'

const DEFAULT_PHOTO = 'https://img.icons8.com/?size=100&id=12438&format=png&color=000000'

export const Navbar = () => {
  const [photo, setPhoto] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null) // wraps the photo, chevron and dropdown

  // Get the profile photo. If it fails or is empty, the default photo is used.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users')
        const user = Array.isArray(res.data) ? res.data[0] : res.data
        setPhoto(user?.photoUrl || '')
      } catch (err) {
        console.error('Get profile error:', err)
      }
    }
    fetchProfile()
  }, [])

  // Close the dropdown when clicking outside of it or pressing Escape
  useEffect(() => {
    if (!showDropdown) return

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowDropdown(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showDropdown])

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  const itemClass = 'text-left text-xs px-4 py-2 theme-hover theme-card theme-border w-full'

  return (
    <div className='fixed top-0 left-0 right-0 h-16 z-50 flex flex-col w-full theme-gradient'>
      <div className='h-16 border-b theme-border flex flex-row justify-between items-center py-3 px-1'>
        {/* Logo */}
        <button
          type='button'
          onClick={() => go('/dashboard/overview')}
          aria-label='Pikol League home'
          className='pl-7 sm:pl-13 text-left'
        >
          <h1 className='font-bold italic theme-text text-base sm:text-l md:text-xl tracking-wide whitespace-nowrap'>
            Pikol <span className='text-[#A8D38D]'>League</span>
          </h1>
        </button>

        <div ref={menuRef} className='relative flex flex-row gap-3 items-center'>
          <ThemeToggle />

          {/* Profile photo (default icon if the user has none) */}
          <div
            onClick={() => go('/dashboard/hero')}
            className='flex items-center justify-center w-10 h-10 rounded-full border theme-border theme-accent overflow-hidden cursor-pointer hover:opacity-80 transition-opacity'
          >
            {photo ? (
              <img src={photo} alt='Profile' className='h-full w-full object-cover' />
            ) : (
              <img src={DEFAULT_PHOTO} alt='Default profile' className='h-6 w-6 theme-icon' />
            )}
          </div>

          {/* Chevron: smaller, softer, and rotates when the menu is open */}
          <button
            type='button'
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-label='Toggle menu'
            aria-haspopup='menu'
            aria-expanded={showDropdown}
            className='theme-text rounded-lg p-1 opacity-60 transition hover:opacity-100'
          >
            <ChevronDown
              size={20}
              className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showDropdown && (
            <div className='absolute right-0 top-full mt-2 w-40 border theme-border rounded-md shadow-md z-50 flex flex-col'>
              <button type='button' onClick={() => go('/dashboard/hero')} className={`${itemClass} rounded-t-md border-b`}>
                Profile
              </button>
              {/* Fixed: removed the trailing space in the path */}
              <button type='button' onClick={() => go('/dashboard/support_components')} className={`${itemClass} border-b`}>
                Support
              </button>
              {/* TODO: go('') stays on the current route. Point this at your About page. */}
              <button type='button' onClick={() => go('/dashboard/about_components')} className={`${itemClass} border-b`}>
                About
              </button>
              <button type='button' onClick={() => go('')} className={`${itemClass} border-b`}>
                Settings
              </button>
              <Signout className={`${itemClass} rounded-b-md`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}