import React from 'react'

export const Bottom_bar = () => {
  return (

    <div className='flex justify-center '>

        <div className='w-100 border border-1  rounded-md fixed bottom-0  flex items-center justify-center'> 
          <div className='flex flex-row gap-2 p-2'> 
              <button className='px-3 py-2 bg-blue-100 hover:bg-white/10 rounded-md'> feed </button> 
              
              <button className='px-3 py-2 bg-blue-100 hover:bg-white/10 rounded-md '> analytics </button> 
              <button className='px-3 py-2 bg-blue-100 hover:bg-white/10 rounded-md'> home </button> 
              <button className='px-3 py-2 bg-blue-100 hover:bg-white/10 rounded-md'> back </button> 
          </div> 
      </div>

    </div>
   
  )
}
