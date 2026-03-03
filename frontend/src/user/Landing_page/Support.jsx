import React from 'react'

const SUPPORT_EMAIL = 'support@pikolleague.com'
const DEVELOPER_EMAIL = 'shensarsale@52gmail.com'

const helpTopics = [
  {
    title: 'Account and sign in',
    text: 'Trouble creating an account, signing in, or changing your details.',
  },
  {
    title: 'Tournaments and brackets',
    text: 'Questions about registering teams, entering scores, or how a bracket is built.',
  },
  {
    title: 'Open play',
    text: 'Help with scheduling, player lists, and running a session.',
  },
]

const buttonClass =
  'w-full sm:w-fit px-6 py-3 font-bold rounded-md bg-white/10 text-gray-200 font-bold text-sm sm:text-base hover:bg-black/10 transition-colors text-center border border-white/10'

export const Support = () => {
  return (
    <div className='w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-10 md:py-14 flex flex-col gap-12 md:gap-16'>

      {/* Support */}
      <section id='support' className='scroll-mt-20 flex flex-col gap-6'>
        <div className='text-center md:text-left'>
          <h2 className='text-gray-100 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight'>
            Need <span className='text-[#A8D38D]'>help?</span>
          </h2>
          <p className='mt-3 text-gray-300 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed mx-auto md:mx-0'>
            Tell us what went wrong and what you were trying to do. Screenshots help.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {helpTopics.map((topic) => (
            <div
              key={topic.title}
              className='rounded-xl border border-white/10 bg-white/10 p-5 text-left'
            >
              <h3 className='text-gray-100 font-bold text-base sm:text-lg'>{topic.title}</h3>
              <p className='mt-2 text-gray-300 text-sm leading-relaxed'>{topic.text}</p>
            </div>
          ))}
        </div>

        <div className='flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center md:justify-start'>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={buttonClass}>
            Email support
          </a>
          <span className='text-gray-300 text-sm sm:text-base break-all'>{SUPPORT_EMAIL}</span>
        </div>
      </section>

      {/* Contact */}
      <section id='contact' className='scroll-mt-20'>
        <div className='w-full bg-[#1e1e1e] border-2 border-gray-700/60 rounded-xl overflow-hidden shadow-2xl'>
          {/* Title bar, same as the video window on the home page */}
          <div className='w-full h-7 sm:h-8 bg-[#1a1a1a] flex items-center px-3 sm:px-4 border-b border-gray-700/60 justify-between'>
            <div className='flex items-center gap-1.5'>
              <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F57] border border-black/10' />
              <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FEB024] border border-black/10' />
              <div className='w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28C840] border border-black/10' />
            </div>
            <div className='text-xs font-mono text-gray-500'>Contact</div>
            <div className='w-12 sm:w-14' />
          </div>

          <div className='p-5 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5 text-center md:text-left'>
            <div>
              <h2 className='text-gray-100 text-xl sm:text-2xl md:text-3xl font-bold'>
                Contact the <span className='text-[#A8D38D]'>developer</span>
              </h2>
              <p className='mt-2 text-gray-300 text-sm sm:text-base max-w-lg leading-relaxed'>
                Found a bug, have an idea, or want to work together? Send a message directly.
              </p>
              <p className='mt-3 text-gray-300 text-sm sm:text-base break-all'>{DEVELOPER_EMAIL}</p>
            </div>

            <a href={`mailto:${DEVELOPER_EMAIL}`} className={`${buttonClass} md:shrink-0`}>
              Email developer
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}