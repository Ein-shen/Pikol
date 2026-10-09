import React from 'react'
import { useNavigate } from 'react-router-dom'
import boyBg from '../assets/boy.png'
import searchBg from '../assets/search.png'
import { ChevronDown } from 'lucide-react'

export const Navbar = () => {
  const navigate = useNavigate()

  return (
    <div className='flex flex-col w-full'>
      <div className='navbar  border-b flex flex-row justify-between items-center p-3'>
        <h1 className='font-bold text-lg pl-7 sm:pl-15'>
          Pikol
        </h1>

        <div className='flex  flex-row gap-6 pr-4 items-center'>
          <form className='flex items-center space-x-2'>
            <div className='relative flex items-center'>
              <img 
                src={searchBg} 
                alt="Search" 
                className='absolute left-3 w-4 h-4 object-contain pointer-events-none' 
              />
              <input 
                type="text"
                className='border pl-9 pr-4 py-1 rounded-md w-23 sm:w-48 focus:outline-none'
                placeholder='Search'
              />
            </div>

            <button 
              className='border px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-mono text-sm'
              type='submit'
            >
              Search
            </button>
          </form>

          {/* Direct inline navigation on click */}
          <div className='flex flex-row gap-1 items-center'>
             <div 
              onClick={() => navigate('/dashboard/hero')}
              className='flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-gray-100 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity'
            >
              <img 
                src={boyBg} 
                alt="Profile" 
                className='w-full h-full object-cover' 
              />

          </div>

          <ChevronDown />

          </div>
         
        </div>
      </div>
    </div>
  )
}