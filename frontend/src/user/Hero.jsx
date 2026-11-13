import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Hero = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  // Edit profile state
  const [showEdit, setShowEdit] = useState(false)
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

  // Close the edit modal on Escape
  useEffect(() => {
    if (!showEdit) return

    const handleKey = (e) => {
      if (e.key === 'Escape') setShowEdit(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showEdit])

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  const handleLogout = () => {
    setShowDropdown(false)
    localStorage.removeItem('token') // placeholder: use your real auth cleanup
    navigate('/login')
  }

  // Open the edit modal with the current user's values
  const openEdit = () => {
    setForm({
      fullname: user?.fullname ?? '',
      username: user?.username ?? '',
    })
    setError('')
    setShowDropdown(false)
    setShowEdit(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.put('/me', form) // adjust method/route to your backend
      setUser(res.data) // or call fetchUser() if your API doesn't return the user
      setShowEdit(false)
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

      <div className="flex flex-row items-center justify-center gap-5">
        {/* Circle */}
        <div className="theme-border theme-accent flex h-24 w-24 items-center justify-center rounded-xl border border-black/80">
          <img
            src="https://img.icons8.com/?size=100&id=12438&format=png&color=000000"
            alt="default"
            height={52}
            width={52}
            className="theme-icon"
          />
        </div>

        {/* Name + email */}
        <div className="flex flex-col items-start justify-start gap-2">
          <span className="flex flex-row items-center gap-1 text-xl font-bold">
            {user?.fullname}

            <button
              type="button"
              aria-label="Edit profile"
              onClick={openEdit}
              className="flex items-center justify-center rounded-lg p-1 opacity-60 transition hover:opacity-100"
            >
              <img
                src="https://img.icons8.com/?size=100&id=11737&format=png&color=000000"
                alt=""
                height={18}
                width={18}
                className="theme-icon"
              />
            </button>
          </span>

          <span className="theme-muted text-xs">{user?.email}</span>
        </div>
      </div>

      {/* Edit profile modal */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setShowEdit(false)}
        >
          <form
            onSubmit={handleSave}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="theme-card theme-border theme-text flex w-full max-w-sm flex-col gap-4 rounded-xl border p-6 shadow-lg"
          >
            <h2 id="edit-profile-title" className="text-lg font-bold">
              Edit profile
            </h2>

            <label className="flex flex-col gap-1 text-sm">
              Full name
              <input
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                className="theme-border rounded-md border bg-transparent px-3 py-2"
                required
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Username
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="theme-border rounded-md border bg-transparent px-3 py-2"
                required
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="theme-hover rounded-md px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="theme-accent rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}