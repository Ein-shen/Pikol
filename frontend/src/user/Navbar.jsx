import React from 'react'

export const Navbar = () => {
  return (
    <div className='flex flex-col w-full'>
      <div className='border-b flex flex-row justify-between items-center p-3'>
        <h1 className='font-bold text-lg'>
          header
        </h1>

        <form className='flex items-center space-x-2'>
          <input 
            className='border px-4 py-1 rounded-md'
            placeholder='Search'
          />
          <button 
            className='border px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200'
            type='submit'
          >
            Search
          </button>
        </form>
      </div>
    </div>
  )
}
