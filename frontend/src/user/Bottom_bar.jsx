import React from 'react'

export const Bottom_bar = () => {
  return (
    <div className='fixed bottom-4 left-1/2 -translate-x-1/2 border rounded-md'>
      <div className='flex flex-row gap-2 p-2'>
        <button className='px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md'>feed</button>
        <button className='px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md'>analytics</button>
        <button className='px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md'>home</button>
        <button className='px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md'>back</button>
      </div>
    </div>
  )
}