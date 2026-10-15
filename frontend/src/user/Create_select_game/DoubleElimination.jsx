import React from 'react'
import { Plus } from 'lucide-react'
export const DoubleElimination = () => {
  return (
    <div className='w-full flex flex-col '>
      <div className='flex flex-row'>
        <h1 className='font-bold text-lg '> Single Elimination</h1>
        <button >
          <Plus size={25} />
        </button>
      </div>
    </div>
  )
}
