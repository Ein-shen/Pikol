import React from 'react'
import { Plus } from 'lucide-react'

import { SingleElilmination } from '../user/Create_select_game/SingleElilmination'
import { useNavigate } from 'react-router-dom'

export const SingleDashb = () => {

   const navigate = useNavigate()
  return (
     <div className='w-full flex flex-col  px-10'>
      <div className='flex  flex justify-between flex-row items-center'>
        <h1 className='font-bold text-lg '> Single Elimination</h1>
        <button

          onClick={( ) => navigate('/dashboard/single')}
          className='flex flex-row border border-black/80 rounded-md  p-2 items-center  space-x-3 text-md font-bold right-0' >
          <span>Create</span>
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
