import React, { useEffect, useRef, useState } from 'react'
// CHANGED: merged the two separate lucide-react imports into one
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export const Hero = () => {
  // CHANGED: removed unused `showEdit` state (wasn't used anywhere)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  // CHANGED: ref used to detect clicks outside the dropdown
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

  // CHANGED: close the dropdown on outside click or Escape
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

  const go = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  // CHANGED: added a logout handler (adjust to however you store auth)
  const handleLogout = () => {
    setShowDropdown(false)
    localStorage.removeItem('token') // placeholder: use your real auth cleanup
    navigate('/login')
  }

  return (
    <div className="flex flex-col w-full gap-20">
      <header className="flex flex-row items-center justify-between">
        <button
          className="theme-hover p-2 rounded-md"
          onClick={() => navigate(-1)}
          aria-label="Go back" // CHANGED: added aria-label for the icon-only button
        >
          <ArrowLeft />
        </button>

        {/* CHANGED: username + dropdown are now wrapped in ONE `relative` container.
            Before, the dropdown was a separate child of the flex header, so it became
            a 4th flex item and pushed the layout around instead of floating. */}
        <div ref={menuRef} className="relative">
          <div className="flex flex-row items-center gap-1 text-lg font-bold">
            {/* CHANGED: removed duplicate text-lg/font-bold (parent already has them) */}
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

          {/* CHANGED: fixed the missing `)}` / syntax, and rebuilt the menu:
              - absolute + top-full so it floats under the username
              - theme-card so it has a background (was see-through)
              - removed duplicate `flex` and conflicting justify-center/items-center
              - `border` kept for width, theme-border for colour */}
          {showDropdown && (
            <div
              role="menu"
              className="theme-card theme-border theme-text absolute left-1/2 top-full z-50 mt-2 flex min-w-44 -translate-x-1/2 flex-col overflow-hidden rounded-md border shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => go(' ')} // CHANGED: wired up with your `go` helper (it was unused). Adjust the route.
                className="text-left text-xs border-b border-white/10 px-4 py-2 theme-hover theme-card theme-border w-full"
              >
                {/* CHANGED: typo "Edi profile" -> "Edit profile" */}
                Edit profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => go(' ')} // CHANGED: adjust the route
                className="text-left text-xs px-4  border-b border-white/10 py-2 theme-hover theme-card theme-border w-full"
              >
                Add account
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="text-left text-xs px-4 py-2  border-b border-white/10 theme-hover theme-card theme-border w-full"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* CHANGED: w-6 -> w-10 so the spacer matches the back button's width
            (24px icon + 16px padding), which keeps the username truly centered */}
        <div className="w-10" />
      </header>

      <div className="flex flex-row items-center justify-center gap-5">
        {/* Circle */}
        {/* CHANGED: onClick={() => navigate()} called navigate with no argument,
            which does nothing/errors. Removed it; add a real path if you want it clickable. */}
        {/* CHANGED: items-center does nothing on a non-flex div, so added flex + justify-center.
            Also w-23/h-23 + p-6 made the 52px icon overflow the box; now w-24/h-24 with no padding. */}
        <div className="theme-border theme-accent flex h-24 w-24 items-center justify-center rounded-xl border border-black/80">
          <img
            src="https://img.icons8.com/?size=100&id=12438&format=png&color=000000"
            alt="default"
            height={52}
            width={52}
            className="theme-icon"
          />
        </div>

        {/* text name */}
        {/* CHANGED: `items-left` and `justify-top` aren't real Tailwind classes -> items-start justify-start */}
        <div className="flex flex-col items-start justify-start gap-2">
          <span className="flex flex-row items-center gap-1 text-xl font-bold">
            {/* CHANGED: removed the hardcoded "Shen Sarsale" text after the fullname.
                It would always show next to the real name. */}
            {user?.fullname}

            {/* CHANGED: span -> button so it's keyboard accessible and clickable */}
           <button
              type="button"
              aria-label="Edit profile"
              onClick={() => go('')}
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

          {/* CHANGED: text-gray-400 -> theme-muted so it follows your dark/light green theme */}
          <span className="theme-muted text-xs">{user?.email}</span>
        </div>
      </div>
    </div>
  )
}