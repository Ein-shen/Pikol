import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'


export const QuadroEliminations = () => {
  const navigate = useNavigate()

  return (
   <div w-full>
      <header className="flex justify-between flex-row items-center">
        <button 
          className='theme-hover p-2 rounded-md '
          onClick={() => navigate(-1)}
          >
          <ArrowLeft />
      
        </button>

        <h1 className="font-bold text-lg">Quadro Elimination</h1>

        <button
          
          className="flex flex-row rounded-md p-2 items-center space-x-3 text-md font-bold"
        >
          
        </button>
      </header>
    </div>
  )
}
