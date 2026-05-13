import { useState } from 'react';
import pikolBg from './assets/pikol.jpg';
import pikolVideo from './assets/pikol-bg.mp4';
import { Link } from 'react-router-dom';
import { About } from './user/Landing_page/About';
import { Support } from './user/Support';
import { Footer } from './user/Landing_page/Footer';

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Support', href: '#support' },
  { label: 'Contact', href: '#contact' },
];

export const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // overflow-clip crops the oversized background without making this a scroll container
    <div className='min-h-screen w-full bg-[#5A9F68] relative overflow-clip flex flex-col'>

      {/* Blurred background image */}
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat blur-md scale-110'
        style={{ backgroundImage: `url(${pikolBg})` }}
      />

      {/* Dark tint overlay */}
      <div className='absolute inset-0 bg-black/30' />

      {/* Fixed top bar (translucent, single row, no backdrop-blur) */}
      <header className='fixed top-0 inset-x-0 z-50 border-b border-white/20 bg-black/60'>
        <div className='flex items-center justify-between h-14 sm:h-16 px-4 sm:px-8 md:px-12 lg:px-20'>

          {/* Logo */}
          <h1 className='font-bold italic text-gray-200 text-base sm:text-lg md:text-xl tracking-wide whitespace-nowrap'>
            Pikol <span className='text-[#A8D38D]'>League</span>
          </h1>

          {/* Right side: desktop nav + sign in + hamburger */}
          <div className='flex items-center gap-2 sm:gap-3'>

            {/* Desktop nav (hidden on mobile) */}
            <nav className='hidden md:flex items-center gap-6 lg:gap-8 mr-3 lg:mr-5'>
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className='text-gray-200 text-base font-semibold hover:text-[#A8D38D] transition-colors'
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <Link
              to='/signup'
              className='px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-md bg-white/10 text-gray-200 font-bold text-xs sm:text-base hover:bg-black/20 transition-colors border border-white/10 whitespace-nowrap'
            >
              Sign in
            </Link>

            {/* Hamburger (mobile only) */}
            <button
              type='button'
              onClick={() => setMenuOpen((o) => !o)}
              aria-label='Toggle menu'
              aria-expanded={menuOpen}
              className='md:hidden w-9 h-9 flex items-center justify-center rounded-md bg-white/10 border border-white/10 text-gray-200 hover:bg-black/20 transition-colors'
            >
              {menuOpen ? (
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                  <path d='M6 6l12 12M18 6L6 18' />
                </svg>
              ) : (
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                  <path d='M4 7h16M4 12h16M4 17h16' />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <nav className='md:hidden flex flex-col px-4 sm:px-8 pb-3 border-t border-white/10'>
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className='py-3 text-gray-200 text-base font-semibold border-b border-white/10 last:border-b-0 hover:text-[#A8D38D] transition-colors'
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Spacer: same height as the header so nothing sits underneath it */}
      <div className='relative z-10 h-14 sm:h-16 shrink-0' />

      {/* Hero section */}
      <main className='relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center px-4 sm:px-8 md:px-12 pt-8 md:pt-12 pb-8 gap-8 md:gap-10 lg:gap-12'>

        {/* Left text content */}
        <div className='w-full md:flex-1 max-w-xl text-center md:text-left flex flex-col items-center md:items-start'>
          <h1 className='text-gray-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight pb-3 sm:pb-4'>
            One platform that can manage{' '}
            <span className='text-[#A8D38D] block sm:inline'>
              your open play & tournaments
            </span>{' '}
            efficiently
          </h1>

          <p className='text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl pb-5 sm:pb-6 max-w-lg leading-relaxed'>
            Streamline scheduling, brackets, and player management — all in one place.
          </p>

          <div className='flex flex-row gap-3 sm:gap-4 w-full sm:w-auto'>
            <Link
              to='/signup'
              className='w-full sm:w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors text-center border border-white/10'
            >
              Create Account
            </Link>

            <a
              href='#about'
              className='w-full sm:w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors text-center border border-white/10'
            >
              Learn more
            </a>
          </div>
        </div>

        {/* Right content: video in a window */}
        <div className='w-full md:flex-1 max-w-xl flex flex-col relative drop-shadow-2xl mt-4 md:mt-0'>
          <div className='w-full bg-[#1e1e1e] border-2 border-gray-700/60 rounded-xl overflow-hidden shadow-2xl'>

            {/* Title bar */}
            <div className='w-full h-7 sm:h-8 bg-[#1a1a1a] flex items-center px-3 sm:px-4 border-b border-gray-700/60 justify-between'>
              <div className='flex items-center gap-1.5'>
                <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F57] border border-black/10' />
                <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FEB024] border border-black/10' />
                <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28C840] border border-black/10' />
              </div>

              <div className='text-xs font-mono text-gray-500 truncate max-w-[120px] sm:max-w-none'>
                Pikol league
              </div>

              <div className='w-12 sm:w-14' />
            </div>

            {/* Video */}
            <div className='w-full aspect-video md:aspect-[13/10] bg-black relative'>
              <video
                src={pikolVideo}
                autoPlay
                loop
                muted
                playsInline
                className='w-full h-full object-cover'
              />
            </div>
          </div>
        </div>
      </main>

      {/* About + Support */}
      <div className='relative z-10'>
        <About />
        <Support />
      </div>

      <Footer />
    </div>
  );
};