
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Signout } from './Signout'
import { ThemeToggle } from '../user/theme_color/ThemeToggle'
import api from '../api'

const DEFAULT_PHOTO = 'https://img.icons8.com/?size=100&id=12438&format=png&color=000000'

// This is the name (key) we use to store the profile photo in localStorage.
// Think of localStorage as a small storage box inside the user's browser.
const CACHE_KEY = 'cachedHeroIcon'

export const Navbar = () => {

  // ==========================================
  // 1. LOAD PHOTO FROM LOCALSTORAGE
  // ==========================================

  const [photo, setPhoto] = useState(() => {

    // localStorage.getItem() retrieves data using the key.
    // Here, we are looking for a saved photo under "cachedHeroIcon".
    const savedPhoto = localStorage.getItem(CACHE_KEY)

    // If a photo exists, use it immediately.
    // If nothing is saved, use an empty string.
    //
    // This means the profile photo can appear immediately
    // without waiting for the backend request.
    return savedPhoto || ''
  })

  const [showDropdown, setShowDropdown] = useState(false)

  const navigate = useNavigate()
  const menuRef = useRef(null)

  // ==========================================
  // 2. SAVE PHOTO TO LOCALSTORAGE
  // ==========================================

  // useEffect watches the "photo" state.
  // Whenever photo changes, this effect runs.
  useEffect(() => {

    if (photo) {

      // localStorage.setItem() saves data in the browser.
      //
      // First argument: the key/name where we save the data.
      // Second argument: the actual photo URL we want to save.
      //
      // Example:
      // Key:   "cachedHeroIcon"
      // Value: "https://example.com/profile.jpg"
      localStorage.setItem(CACHE_KEY, photo)

    } else {

      // If there is no photo, remove the old cached photo.
      // This prevents an outdated photo from remaining in storage.
      localStorage.removeItem(CACHE_KEY)
    }

  }, [photo]) // Run this effect whenever "photo" changes.

  // ==========================================
  // 3. FETCH PROFILE PHOTO FROM BACKEND
  // ==========================================

  useEffect(() => {

    const fetchProfile = async () => {
      try {

        // Request the user's information from the backend.
        const res = await api.get('/users')

        const user = Array.isArray(res.data)
          ? res.data[0]
          : res.data

        // Update React state with the photo URL from the backend.
        //
        // IMPORTANT:
        // We do not manually save to localStorage here.
        //
        // Updating photo triggers the useEffect in section 2,
        // which automatically saves the new photo.
        setPhoto(user?.photoUrl || '')

      } catch (err) {
        console.error('Get profile error:', err)
      }
    }

    fetchProfile()

  }, []) // Empty array means fetch once when Navbar mounts.

  // ==========================================
  // 4. CLOSE DROPDOWN
  // ==========================================

  useEffect(() => {
    if (!showDropdown) return

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showDropdown])

  // ==========================================
  // 5. NAVIGATION
  // ==========================================

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  const itemClass = 'flex flex-row gap-2 items-center text-left text-xs px-4 py-2 theme-hover theme-card theme-border w-full'

  // ==========================================
  // 6. DISPLAY
  // ==========================================

  return (
    <div className='fixed animate-fade-in animation-delay-200 top-0 left-0 right-0 h-16 z-50 flex flex-col w-full theme-gradient'>

      <div className='h-16 border-b theme-border flex flex-row justify-between items-center py-3 px-1'>

        {/* LOGO */}
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

          {/* PROFILE PHOTO */}
          <div
            onClick={() => go('/dashboard/hero')}
            className='flex items-center justify-center w-10 h-10 rounded-full border theme-border theme-accent overflow-hidden cursor-pointer hover:opacity-80 transition-opacity'
          >
            {photo ? (
              <img
                src={photo}
                alt='Profile'
                className='h-full w-full object-cover'
              />
            ) : (
              <img
                src={DEFAULT_PHOTO}
                alt='Default profile'
                className='h-6 w-6 theme-icon'
              />
            )}
          </div>

          {/* DROPDOWN BUTTON */}
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
              className={`transition-transform duration-200 ${
                showDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* DROPDOWN MENU */}
          {showDropdown && (
            <div className='absolute animate-fade-in animation-delay-100 right-0 top-full mt-2 w-40 border theme-border rounded-md shadow-md z-50 flex flex-col'>

              {/* PROFILE */}
              <button
                type='button'
                onClick={() => go('/dashboard/hero')}
                className={`${itemClass} rounded-t-md border-b`}
              >
                <img
                  src="https://img.icons8.com/?size=100&id=Cssf43cjx2fu&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />
                Profile
              </button>

              {/* SUPPORT */}
              <button
                type='button'
                onClick={() => go('/dashboard/support_components')}
                className={`${itemClass} border-b`}
              >
                <img
                  src="https://img.icons8.com/?size=100&id=83273&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />
                Support
              </button>

              {/* ABOUT */}
              <button
                type='button'
                onClick={() => go('/dashboard/about_components')}
                className={`${itemClass} border-b`}
              >
                <img
                  src="https://img.icons8.com/?size=100&id=14313&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />
                About
              </button>

              {/* SETTINGS */}
              <button
                type='button'
                onClick={() => go('/dashboard/settings_components')}
                className={`${itemClass} border-b`}
              >
                <img
                  src="https://img.icons8.com/?size=100&id=364&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />
                Settings
              </button>

              {/* SIGN OUT */}
              <span className='theme-hover flex flex-row items-center gap-2 w-full px-4 py-2 text-left text-xs sm:py-2.5'>
                <img
                  src="https://img.icons8.com/?size=100&id=96qSfJhNi0UF&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />

                <Signout className="theme-hover w-full text-left text-xs" />
              </span>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
