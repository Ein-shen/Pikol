import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import boyBg from '../assets/boy.png'
import searchBg from '../assets/search.png'
import { ChevronDown } from 'lucide-react'
import { Signout } from './Signout'


export const Navbar = () => {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className='fixed top-0 left-0 right-0 h-16 z-50 flex flex-col w-full bg-background'>
      <div className='navbar h-16 border-b flex flex-row justify-between items-center p-3'>
        <span className='font-bold flex flex-row gap-2 text-lg pl-7 sm:pl-13 text-green-400 '>
          Pikol <h1 className='text-white'>league</h1>
        </span>

          {/* Profile + dropdown (relative so the dropdown anchors to this) */}
          <div className='relative flex flex-row gap-1 items-center'>
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

            <button
              type='button'
              aria-label='Toggle menu'
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              <ChevronDown />
            </button>

            {showDropdown && (
              <div className='absolute right-0 top-full mt-2 w-40 bg-white border border-black/80 rounded-md shadow-md z-50'>
                <div className='flex flex-col'>
                  <button
                    type='button'
                     
                    className='text-left text-xs  rounded-t-md border-b border-black/80 px-4 py-2 text-md hover:bg-gray-100'
                  >
                    Profile
                  </button>
                  <button
                    type='button'
                  
                    className='text-left text-xs border-b border-black/80 px-4 py-2 text-md hover:bg-gray-100'
                  >
                    Support
                  </button>
                   <button
                    type='button'
                    
                    className='text-left px-4 text-xs  border-b border-black/80 py-2 text-md hover:bg-gray-100'
                  >
                    Settings
                  </button>
                  <button
                    type='button'
                    
                    className='text-left  px-4 text-xs  rounded-b-md py-2 text-md hover:bg-gray-100'
                  >
                    <Signout />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    
  )
}