import pikolBg from './assets/pikol.jpg';
import pikolVideo from './assets/pikol-bg.mp4';
import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div className='min-h-screen w-full bg-[#5A9F68] relative overflow-hidden flex flex-col'>

      {/* Blurred background image */}
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat blur-md scale-110'
        style={{ backgroundImage: `url(${pikolBg})` }}
      />

      {/* Dark tint overlay */}
      <div className='absolute inset-0 bg-black/30' />

      {/* 📍 1. ADJUST HEADER PADDING HERE: Change 'py-2' to 'py-1' or 'py-0' to move header up */}
      <div className='relative z-10 flex flex-row border-white/30 border-b items-center justify-between px-5 sm:px-8 md:px-12 lg:px-20 py-2'>
        <h1 className='font-bold italic text-gray-300 text-base sm:text-lg md:text-xl'>
          Pikol League
        </h1>

        <Link 
          to="/login"
          className='px-4 sm:px-5 py-2 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/20 transition-colors'
        >
          Sign in
        </Link>
      </div>

      {/* 📍 2. ADJUST HERO PADDING HERE: 'pt-0' removes ALL top space between header line and content */}
      <div className='relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-center px-5 sm:px-8 md:px-12 pt-15 pb-8 gap-8 md:gap-12 flex-1'>
        
        {/* Left Text Content — 📍 Add 'mt-2' or 'mt-4' here if you want ONLY the text pushed down */}
        <div className='w-full md:flex-1 max-w-xl'>
          <h1 className='text-gray-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight pb-4'>
            One platform that can manage{' '}
            <span className='text-[#A8D38D]'>
              your open play & tournaments
            </span>{' '}
            efficiently
          </h1>

          <p className='text-gray-300 text-base sm:text-lg md:text-xl pb-6 max-w-lg'>
            Streamline scheduling, brackets, and player
            management — all in one place.
          </p>

          <div className='space-x-5'>
            <Link 
              to="/signup"
              className='w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors'
            >
              Create Account
            </Link>

            <Link 
              to="/about"
              className='w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors'
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Right Content: Video — 📍 Add 'mt-2' or 'mt-4' here if you want ONLY the video pushed down */}
        <div className='w-full pt-5  md:flex-1 max-w-xl flex flex-col relative drop-shadow-2xl'>
          
          {/* Window Container */}
          <div className='w-full bg-[#1e1e1e] border-2 border-gray-700/60 rounded-xl overflow-hidden shadow-2xl'>
            
            {/* Title Bar with Window Controls */}
            <div className='w-full h-8 bg-[#1a1a1a] flex items-center px-4 border-b border-gray-700/60'>
              <div className='flex items-center gap-1.5'>
                <div className='w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10' />
                <div className='w-3 h-3 rounded-full bg-[#FEB024] border border-black/10' />
                <div className='w-3 h-3 rounded-full bg-[#28C840] border border-black/10' />
              </div>
              <div className='flex-1 text-center text-xs font-mono text-gray-500 pr-12'>
                pikol.mp4
              </div>
            </div>

            {/* Video Content Area */}
            <div className='w-full aspect-[13/10] bg-black'>
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

      </div>

    </div>
  );
};