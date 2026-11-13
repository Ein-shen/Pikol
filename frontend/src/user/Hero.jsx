import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Hero = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ fullname: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Ref used to detect clicks outside the dropdown
  const menuRef = useRef(null)

  const fetchUser = async () => {
    try {
      const res = await api.get('/me')
      setUser(res.data)
    } catch (err) {
      console.error('Get User error:', err)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  // Close the dropdown on outside click or Escape
  useEffect(() => {
    if (!showDropdown) return

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowDropdown(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showDropdown])

  // Cancel inline editing on Escape
  useEffect(() => {
    if (!isEditing) return

    const handleKey = (e) => {
      if (e.key === 'Escape') setIsEditing(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isEditing])

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  const handleLogout = () => {
    setShowDropdown(false)
    localStorage.removeItem('token') // placeholder: use your real auth cleanup
    navigate('/login')
  }

  // Switch the name into edit mode with the current user's values
  const openEdit = () => {
    setForm({
      fullname: user?.fullname ?? '',
      username: user?.username ?? '',
    })
    setError('')
    setShowDropdown(false)
    setIsEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.put('/me', form) // adjust method/route to your backend
      setUser(res.data) // or call fetchUser() if your API doesn't return the user
      setIsEditing(false)
    } catch (err) {
      console.error('Update profile error:', err)
      setError('Could not save your changes. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col w-full gap-20">
      <header className="flex flex-row items-center justify-between">
        <button
          className="opacity-60 transition hover:opacity-100 p-2 rounded-md"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        {/* Username + dropdown wrapped in ONE relative container */}
        <div ref={menuRef} className="relative">
          <div className="flex flex-row items-center gap-1 text-lg font-bold">
            <span>@{user?.username}</span>
            <button
              type="button"
              onClick={() => setShowDropdown((prev) => !prev)}
              aria-label="Toggle menu"
              aria-haspopup="menu"
              aria-expanded={showDropdown}
              className="theme-text rounded-lg p-1 opacity-60 transition hover:opacity-100"
            >
              <ChevronDown
                size={20}
                className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showDropdown && (
            <div
              role="menu"
              className="theme-card theme-border theme-text absolute left-1/2 top-full z-50 mt-2 flex min-w-44 -translate-x-1/2 flex-col overflow-hidden rounded-md border shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={openEdit}
                className="text-left text-xs border-b border-white/10 px-4 py-2 theme-hover theme-card theme-border w-full"
              >
                Edit profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => go('/add-account')} // adjust the route
                className="text-left text-xs px-4 border-b border-white/10 py-2 theme-hover theme-card theme-border w-full"
              >
                Add account
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="text-left text-xs px-4 py-2 theme-hover theme-card theme-border w-full"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Spacer matches the back button width so the username stays centered */}
        <div className="w-10" />
      </header>

      <div className="flex flex-row justify-center gap-5">
        {/* Circle */}
        <div className="theme-border theme-accent flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-black/80">
          <img
            src="https://img.icons8.com/?size=100&id=12438&format=png&color=000000"
            alt="default"
            height={52}
            width={52}
            className="theme-icon"
          />
        </div>

        {/* Name + email */}
        {isEditing ? (
          <form onSubmit={handleSave} className="flex w-64 flex-col gap-3 sm:w-72">
            <div className="flex flex-col  ">
              <label htmlFor="edit-fullname" className="text-sm font-semibold">
                Name
              </label>
              <input
                id="edit-fullname"
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                className="theme-border w-full rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-username" className="text-sm font-semibold">
                Username
              </label>
              <input
                id="edit-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="theme-border w-full rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                required
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="theme-card theme-border theme-hover rounded-md border px-4 py-1.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
         <div className="flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <span className="text-2xl font-bold capitalize leading-tight">
                {user?.fullname} shen sarsale
              </span>
              <span className="theme-muted text-sm leading-tight">{user?.email}</span>
            </div>

            <button
              type="button"
              aria-label="Edit profile"
              onClick={openEdit}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white px-2 py-1 text-xs opacity-60 transition hover:opacity-100"
            >
              Edit Profile
              <img
                src="https://img.icons8.com/?size=100&id=11737&format=png&color=000000"
                alt=""
                height={14}
                width={14}
                className="theme-icon"
              />
            </button>
          </div>
            
      
        )}
      </div>
    </div>
  )
}