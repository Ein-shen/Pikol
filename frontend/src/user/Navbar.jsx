import React, { useEffect, useState } from 'react'
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

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  const itemClass = 'text-left text-xs px-4 py-2 theme-hover theme-card theme-border w-full'

  return (
    <div className='fixed top-0 left-0 right-0 h-16 z-50 flex flex-col w-full theme-gradient'>
      <div className='h-16 border-b theme-border flex flex-row justify-between items-center p-3'>
        <span className='font-bold flex flex-row gap-2 text-lg pl-7 theme-text sm:pl-13'>
          Pikol <h1 className='theme-text opacity-80'>league</h1>
        </span>

        <div className='relative flex flex-row gap-3 items-center'>
          <ThemeToggle />

          {/* Profile photo (default icon if the user has none) */}
          <div
            onClick={() => go('/dashboard/hero')}
            className='flex items-center justify-center w-10 h-10 rounded-full border theme-border theme-card overflow-hidden cursor-pointer hover:opacity-80 transition-opacity'
          >
            {photo ? (
              <img src={photo} alt='Profile' className='h-full w-full object-cover' />
            ) : (
              <img src={DEFAULT_PHOTO} alt='Default profile' className='h-6 w-6 theme-icon' />
            )}
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
            <div className='absolute right-0 top-full mt-2 w-40 border theme-border rounded-md shadow-md z-50 flex flex-col'>
              <button type='button' onClick={() => go('/dashboard/hero')} className={`${itemClass} rounded-t-md border-b`}>
                Profile
              </button>
              <button type='button' onClick={() => go(' ')} className={`${itemClass} border-b`}>
                Support
              </button>
              <button type='button' onClick={() => go('/dashboard/about')} className={`${itemClass} border-b`}>
                About
              </button>
              <button type='button' onClick={() => go('/dashboard/settings')} className={`${itemClass} border-b`}>
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