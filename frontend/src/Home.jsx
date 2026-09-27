import pikolBg from './assets/pikol.jpg';
import pikolVideo from './assets/pikol-bg.mp4';
import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div className='min-h-screen w-full bg-[#5A9F68] relative overflow-hidden flex flex-col justify-between'>

      {/* Blurred background image */}
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat blur-md scale-110'
        style={{ backgroundImage: `url(${pikolBg})` }}
      />

      {/* Dark tint overlay */}
      <div className='absolute inset-0 bg-black/30' />

      {/* Header: logo + sign in */}
      <header className='relative z-10 flex flex-row border-white/30 border-b items-center justify-between px-4 sm:px-8 md:px-12 lg:px-20 py-3 sm:py-4 w-full'>
        <h1 className='font-bold italic text-gray-300 text-base sm:text-lg md:text-xl tracking-wide'>
          Pikol League
        </h1>

        <Link 
          to="/login"
          className='px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-md bg-white/10 text-gray-200 font-bold text-xs sm:text-base hover:bg-black/20 transition-colors border border-white/10'
        >
          Sign in
        </Link>
      </header>

      {/* Hero section */}
      <main className='relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center px-4 sm:px-8 md:px-12 pt-4 sm:pt-8 md:pt-12 pb-8 gap-8 md:gap-10 lg:gap-12 flex-1'>
        
        {/* Left Text Content */}
        <div className='w-full md:flex-1 max-w-xl text-center md:text-left flex flex-col items-center md:items-start'>
          <h1 className='text-gray-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight sm:leading-tight md:leading-tight pb-3 sm:pb-4'>
            One platform that can manage{' '}
            <span className='text-[#A8D38D] block sm:inline'>
              your open play & tournaments
            </span>{' '}
            efficiently
          </h1>

          <p className='text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl pb-5 sm:pb-6 max-w-lg leading-relaxed'>
            Streamline scheduling, brackets, and player management — all in one place.
          </p>

          <div className='flex flex-row sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto'>
            <Link 
              to="/signup"
              className='w-full sm:w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors text-center border border-white/10'
            >
              Create Account
            </Link>

            <Link 
              to="/about"
              className='w-full sm:w-fit px-6 py-3 rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors text-center border border-white/10'
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Right Content: Video wrapped in Terminal/Browser Window */}
        <div className='w-full md:flex-1 max-w-xl flex flex-col relative drop-shadow-2xl mt-4 md:mt-0'>
          
          {/* Window Container */}
          <div className='w-full bg-[#1e1e1e] border-2 border-gray-700/60 rounded-xl overflow-hidden shadow-2xl'>
            
            {/* Title Bar with Window Controls */}
            <div className='w-full h-7 sm:h-8 bg-[#1a1a1a] flex items-center px-3 sm:px-4 border-b border-gray-700/60 justify-between'>
              <div className='flex items-center gap-1.5'>
                <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F57] border border-black/10' />
                <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FEB024] border border-black/10' />
                <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28C840] border border-black/10' />
              </div>

              <div className='text-xs font-mono text-gray-500 truncate max-w-[120px] sm:max-w-none'>
                pikol.mp4
              </div>

              <div className='w-12 sm:w-14' /> {/* Decorative Spacer to keep title centered */}
            </div>

            {/* Video Content Area */}
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

    </div>
  );
};