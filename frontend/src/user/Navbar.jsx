import React from 'react'
import boyBg from '../assets/boy.png'
import searchBg from '../assets/search.png'
export const Navbar = () => {
  return (
    <div className='flex flex-col w-full'>
      <div className='border-b flex flex-row justify-between items-center p-3'>
        <h1 className='font-bold text-lg pl-7 sm:pl-15  '>
          Pikol
        </h1>


        <div className='flex flex-row gap-6 pr-4'>
            <form className='flex items-center space-x-2'>
              
              
              {/* Input with padding-left (pl-9) so text doesn't overlap the icon */}
              <input 
                type="text"
                className='border pl-9 pr-4 py-1 rounded-md w-23 sm:w-48 focus:outline-none'
                placeholder='Search'
              />
              <button 
                className='border px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center'
                type='submit'
              >
                <img 
                  src={searchBg} 
                  alt="Search" 
                  className='w-4  h-5 object-contain' 
                />
              </button>
            </form>

            <div className='flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-gray-100 overflow-hidden'>
              <img 
                src={boyBg} 
                alt="Profile" 
                className='w-full h-full object-cover' 
              />
            </div>
        </div>
        
      </div>
    </div>
  )
}
