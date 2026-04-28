import React from 'react'

export const Hero = () => {
  return (
    <div className='flex flex-col w-full '>
        <div>
            <h1 className='font-bold text-lg'>
                Hero section
            </h1>
        </div>

        <div className='space-y-5  '>
           <button className='rounded-full border border-black/80 p-3'>
            
           </button>
           <h1 className='rounded-md font-bold text-lg border border-black/80 p-2'>
            Username:
           </h1>
           <h1 className='rounded-md font-bold text-lg border border-black/80 p-3'>
            Name:
           </h1>
        </div>
    </div>
  )
}
