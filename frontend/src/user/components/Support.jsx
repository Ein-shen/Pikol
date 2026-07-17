import React from 'react'

const contacts = [
  {
    icon: '✉️',
    label: 'Email us',
    value: 'Shensarsale25@gmail.com',
    href: 'mailto:Shensarsale25@gmail.com',
  },
  {
    icon: '🛟',
    label: 'Support',
    value: 'Pikolleague@support.com',
    href: 'mailto:Pikolleague@support.com',
  },
]

export const Support = () => {
  return (
    <section
      id='support'
      className='scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-6 pb-12 sm:pb-16'
    >
      <div className='rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8'>
        <div className='text-center md:text-left max-w-md'>
          <span className='inline-block px-3 py-1 mb-4 rounded-full bg-white/10 border border-white/10 text-[#A8D38D] text-xs sm:text-sm font-semibold tracking-wider uppercase'>
            Support
          </span>
          <h2 className='text-gray-100 text-2xl sm:text-3xl font-bold leading-tight pb-2'>
            Need <span className='text-[#A8D38D]'>help</span>?
          </h2>
          <p className='text-gray-300 text-sm sm:text-base leading-relaxed'>
            For more inquiries, please contact us. We'll get back to you as
            soon as we can.
          </p>
        </div>

        <div className='flex flex-col gap-3 w-full md:w-auto md:min-w-[320px]'>
          {contacts.map((c) => (
            <a
              key={c.value}
              href={c.href}
              className='flex items-center gap-4 p-4 rounded-xl bg-black/20 border border-white/10 hover:bg-black/30 transition-colors'
            >
              <div className='w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-[#A8D38D]/20 border border-[#A8D38D]/30 text-lg'>
                {c.icon}
              </div>
              <div className='min-w-0'>
                <p className='text-gray-400 text-xs uppercase tracking-wider'>{c.label}</p>
                <p className='text-gray-100 font-mono text-sm sm:text-base truncate'>{c.value}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}