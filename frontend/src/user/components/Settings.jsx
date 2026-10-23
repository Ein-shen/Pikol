import React from 'react'
import { ArrowLeft } from 'lucide-react'
 export const Settings = () => {
  return (
    <div w-full>
      <header className="flex justify-between flex-row items-center">
        <button  >
          <ArrowLeft />
      
        </button>

        <h1 className="font-bold text-lg">Settings</h1>

        <button
          
          className="flex flex-row rounded-md p-2 items-center space-x-3 text-md font-bold"
        >
          
        </button>
      </header>
    </div>
  )
}
