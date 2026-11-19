import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
 export const Settings_components = () => {

  const navigate = useNavigate()
  return (
    <div w-full>
      <header className="flex justify-between flex-row items-center">
        <button
             type="button"
              className="rounded-md p-2 opacity-60 transition hover:opacity-100"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              >
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
