import React, { useState } from 'react'
import { LayoutDashboard, Settings, Sliders, Trophy, Menu, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Signout } from './Signout'
import { useAuth } from '../context/AuthContext'
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/hero' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
  { label: 'Matching', icon: Sliders, path: '' },
  { label: 'Leaderboards', icon: Trophy, path: ' ' },
]

export const Sidebar = () => {
  

  const {setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavigate = (path) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* Menu button - mobile only, hidden while the drawer is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          style={{ zIndex: 30 }}
          className="md:hidden  fixed left-4 top-[4.75rem] flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2 font-mono text-sm"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Overlay - mobile only, darkens only the page behind the sidebar */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 30 }}
          className="md:hidden  fixed inset-x-0 top-16 bottom-0 bg-black/50"
        />
      )}

      {/* Sidebar: solid background, borders on top and right, always above the overlay */}
      <aside
        style={{
          zIndex: 40,
          backgroundColor: '#dcfce7',
          borderTop: '1px solid rgba(0,0,0,0.8)',
          borderRight: '1px solid rgba(0,0,0,0.8)',
        }}
        className={`theme-card theme-text w-54 py-0 sm:pt-5 fixed left-0 top-16 bottom-0 flex flex-col items-center text-center transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Close button - mobile only */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-2 right-2"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Main navigation */}
        <nav className="w-full  space-y-4 px-6 pt-5">
          {navItems.map(({ label, icon: Icon, path }) => {
            const isActive =
              location.pathname === path || location.pathname.startsWith(path + '/')

            return (
              <button
                key={label}
                onClick={() => handleNavigate(path)}
                className={`w-full flex A items-center gap-2 font-mono text-md rounded-md p-2 transition-colors theme-hover ${
                  isActive ? 'border border-theme-border/10 theme-bg' : ''
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            )
          })}
          <Signout />
        </nav>
      </aside>
    </>
  )
}