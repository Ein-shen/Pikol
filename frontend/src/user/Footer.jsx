import React from 'react'
import { Link } from 'react-router-dom'

const links = [
  { label: 'Home', to: '/' },
  { label: 'About', href: '#about' },
  { label: 'Support', href: '#support' },
  { label: 'Sign in', to: '/login' },
  { label: 'Create Account', to: '/signup' },
]

const linkClass = 'text-gray-300 text-sm hover:text-[#A8D38D] transition-colors'

export const Footer = () => {
  return (
    <footer className='relative z-10 w-full border-t border-white/20 bg-black/20 backdrop-blur-sm'>
      <div className='w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8'>

        {/* Brand */}
        <div className='text-center md:text-left max-w-sm'>
          <h2 className='font-bold italic text-gray-200 text-lg sm:text-xl tracking-wide pb-2'>
            Pikol <span className='text-[#A8D38D]'>League</span>
          </h2>
          <p className='text-gray-400 text-sm leading-relaxed'>
            One platform to manage your open play and tournaments efficiently.
          </p>
        </div>

        {/* Quick links */}
        <nav className='flex flex-col items-center md:items-start gap-2'>
          <p className='text-gray-400 text-xs uppercase tracking-wider pb-1'>Quick Links</p>
          {links.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className={linkClass}>{l.label}</Link>
            ) : (
              <a key={l.label} href={l.href} className={linkClass}>{l.label}</a>
            )
          )}
        </nav>

        {/* Contact */}
        <div id='contact' className='scroll-mt-28 flex flex-col items-center md:items-start gap-2'>
          <p className='text-gray-400 text-xs uppercase tracking-wider pb-1'>Contact</p>
          <a href='mailto:Shensarsale25@gmail.com' className={linkClass}>
            Shensarsale25@gmail.com
          </a>
          <a href='mailto:Pikolleague@support.com' className={linkClass}>
            Pikolleague@support.com
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className='border-t border-white/10 py-4 px-4'>
        <p className='text-center text-gray-400 text-xs sm:text-sm'>
          © {new Date().getFullYear()} Pikol League. All rights reserved.
        </p>
      </div>
    </footer>
  )
}