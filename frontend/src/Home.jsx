import React from 'react'

export const Home = () => {
  return (
    <div className='h-screen w-full bg-[#1F4964] px-10 pt-8'>
      <div className='flex flex-row items-center justify-between border-white/50 h-16 px-4 py-4'>
        <h1 className='font-bold text-gray-300 text-lg'>
          Pikol League
        </h1>

        <button className='px-5 py-3 hover:bg-white/20 rounded-md bg-white/10 text-gray-200 font-bold text-md'>
          Signin
        </button>
      </div>
    </div>
  )
}
