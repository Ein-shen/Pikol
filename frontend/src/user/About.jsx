import React from 'react'

const features = [
  {
    icon: '🏓',
    title: 'Open Play',
    desc: 'Create open play sessions where players can join, rotate, and get matched automatically.',
  },
  {
    icon: '🏆',
    title: 'Tournaments',
    desc: 'Run brackets with automatic scheduling and live score tracking from start to finish.',
  },
  {
    icon: '👥',
    title: 'Player Management',
    desc: 'Keep track of players, teams, and standings in one organized place.',
  },
  {
    icon: '⚖️',
    title: 'Fair Matchups',
    desc: 'Pick your matching type so every game stays balanced, fair and square.',
  },
]

export const About = () => {
  return (
    <section
      id='about'
      className='scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-12 sm:py-16'
    >
      <div className='text-center max-w-2xl mx-auto mb-10 sm:mb-14'>
        <span className='inline-block px-3 py-1 mb-4 rounded-full bg-white/10 border border-white/10 text-[#A8D38D] text-xs sm:text-sm font-semibold tracking-wider uppercase'>
          About
        </span>
        <h2 className='text-gray-100 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight pb-3'>
          What is <span className='text-[#A8D38D]'>Pikol League</span>?
        </h2>
        <p className='text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed'>
          A platform used to organize pikol matches, making sure every game is
          fair and square. Choose the type of matching you want and let us
          handle the rest.
        </p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5'>
        {features.map((f) => (
          <div
            key={f.title}
            className='flex flex-col gap-3 p-5 sm:p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/15 hover:-translate-y-1 transition-all duration-300'
          >
            <div className='w-11 h-11 flex items-center justify-center rounded-lg bg-[#A8D38D]/20 border border-[#A8D38D]/30 text-xl'>
              {f.icon}
            </div>
            <h3 className='text-gray-100 font-bold text-base sm:text-lg'>{f.title}</h3>
            <p className='text-gray-300 text-sm leading-relaxed'>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}