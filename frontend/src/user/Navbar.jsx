import React from 'react'

export const Navbar = () => {
  return (
    <div className='flex flex-col w-full'>
      <div className='border-b flex flex-row justify-between items-center p-3'>
        <h1 className='font-bold text-lg pl-7 sm:pl-15  '>
          Pikol
        </h1>


        <div className='flex flex-row gap-6 pr-4'>
            <form className='flex items-center space-x-2'>
              <input 
                className='border px-4 py-1 rounded-md w-23 sm:w-48 '
                placeholder='Search'
              />
              <button 
                className='border px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200'
                type='submit'
              >
                Search
              </button>
            </form>

            <div className=' border border-1 px-5 py-5 rounded-full '>

            </div>
        </div>
        
      </div>
    </div>
  )
}
