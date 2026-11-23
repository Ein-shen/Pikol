import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RecentTournaments } from './extra/RecentTournaments'
const navItems = [
  {
    label: 'Overview',
    iconSrc: 'https://img.icons8.com/?size=100&id=aOXlHTOpHruk&format=png&color=000000',
    path: '/dashboard/overview',
  },
  {
    label: 'Matching',
    iconSrc: 'https://img.icons8.com/?size=100&id=eAodw0TpqLlC&format=png&color=000000',
    path: '/dashboard/matching',
  },
  // { label: 'Leaderbords', iconSrc: 'https://img.icons8.com/?size=100&id=aLTVTLhwbxnK&format=png&color=000000', path: '/dashboard/leaderboards' },
]

export const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavigate = (path) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* Menu button - mobile only, small, under the navbar. Hidden while the drawer is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="md:hidden fixed left-4 top-[4.75rem] z-30 flex items-center gap-2 rounded-md border theme-border theme-card theme-text px-2 py-2 font-mono text-sm"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Overlay - mobile only, starts right below the navbar */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-black/50 z-30"
        />
      )}

      {/* Sidebar: always starts right below the navbar */}
      <div
        className={`theme-card w-56 py-0 sm:pt-5 fixed left-0 top-16 bottom-0 flex flex-col items-center text-center theme-text border-r theme-border z-40 transform overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        // Slide in from the left. Tailwind v4 moves the drawer with the CSS `translate`
        // property (not `transform`), so `translate` is what has to be transitioned.
        style={{
          transition:
            'translate 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Close button - mobile only. Brings the Menu button back */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-1 p-1 rounded-md theme-hover right-1 theme-text  pt-1  "
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Main Navigation */}
        <div className="w-full space-y-4 px-6 pt-10">
          {navItems.map(({ label, iconSrc, path }) => {
            const isActive =
              location.pathname === path || location.pathname.startsWith(path + '/')

            return (
              <button
                key={label}
                onClick={() => handleNavigate(path)}
                className={`w-full flex items-center gap-2 font-mono rounded-md p-2  transition-colors theme-hover ${
                  isActive ? 'border border-theme-border/10 theme-bg' : ''
                }`}
              >
                <img src={iconSrc} alt="" className="w-4 h-4 shrink-0 theme-icon" />
                <span className="text-md">{label}</span>
              </button>
            )
          })}
        </div>
        

        <RecentTournaments onNavigate={() => setIsOpen(false)} />
        
      </div>
    </>
  )
}