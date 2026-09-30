import React from 'react'

export const Sidebar = () => {
  return (
    <div className='h-full w-46 border-r border-black'>
      <div className='py-6 space-y-5 flex flex-col px-5'>
          <button className='border border-1 rounded-md p-1'>
              Dashboard
          </button>

          <button className='border border-1 rounded-md p-1'>
              Settings
          </button>

          <button className='border border-1 rounded-md p-1'>
              Matching
          </button>

          <button className='border border-1 rounded-md p-1'>
              Leaderboards
          </button>
      </div>
    </div>
  )
}