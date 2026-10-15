import React, { useState } from 'react'
import { Settings, Sliders, Menu, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

const navItems = [
  {
    label: 'Overview',
    iconSrc: 'https://img.icons8.com/?size=100&id=aOXlHTOpHruk&format=png&color=000000',
    path: '/dashboard/overview',
  },
  { label: 'Matching',iconSrc: 'https://img.icons8.com/?size=100&id=eAodw0TpqLlC&format=png&color=000000',path: '/dashboard/matching' },
  { label: 'Leaderbords', iconSrc: 'https://img.icons8.com/?size=100&id=aLTVTLhwbxnK&format=png&color=000000', path: '/dashboard/leaderboards' },
]

export const Sidebar = () => {
  const { setUser } = useAuth()
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
          className="md:hidden fixed left-4 top-[4.75rem] flex items-center gap-2 rounded-md border border-black/80 bg-background px-2 py-2 font-mono text-sm"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Overlay - mobile only */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 30 }}
          className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-black/50"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          zIndex: 40,
          backgroundColor: '#dcfce7',
        }}
        className={`theme-card theme-text w-56 py-0 sm:pt-5 fixed left-0 top-16 bottom-0 border-r border-black/80 flex flex-col items-center text-center transform transition-transform duration-300 overflow-y-auto ${
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
        <nav className="w-full space-y-4 px-6  pt-5">
          {navItems.map(({ label, icon: Icon, iconSrc, path }) => {
            const isActive =
              location.pathname === path || location.pathname.startsWith(path + '/')

            return (
              <button
                key={label}
                onClick={() => handleNavigate(path)}
                className={`w-full flex  items-center gap-2 font-mono text-md rounded-md p-2 transition-colors theme-hover ${
                  isActive ? 'border border-black/80 theme-bg' : ''
                }`}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="" className="w-4 h-4 shrink-0" />
                ) : (
                  Icon && <Icon className="w-4 h-4 shrink-0" />
                )}
                {label}
              </button>
            )
          })}
          
        </nav>
      </aside>
    </>
  )
}