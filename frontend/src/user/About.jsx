import React from 'react'

export const About = () => {
  return (
    <div className='h-screen w-full bg-green-200 flex flex-row p-4 gap-4'>
      <div className='flex flex-col border border-black/80 p-3 rounded-md'>
      <h1 className='text-lg  text-black font-bold'>
        pikol league
        
      </h1>
      <span className=' text-md text-black '>is a platform used to organize pikol matches, making sure that it is fair and square</span>

        
      </div>
      <div className='border border-black/80 rounded-md p-3'>
        <h1 className='font-mono text-lg'>
          you can select what type of matching you want in teh game

        </h1>

      </div>
    </div>
  )
}
