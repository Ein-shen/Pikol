import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'




const about_matching = [
  {
    label:' Standard Tournament',
    Explain: 'bla bla',

  },

  {
    label:'Single Elimination',
    Explain: 'bla bla',

  },

  {
    label:'Open play',
    Explain: 'bla bla',

  },

]
export const About_components = () => {
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

        <h1 className="font-bold text-lg">About</h1>

        <div>

          <h1 className='text-xl font-bold'>
            Standard Tournament
          </h1>


          
        </div> 
      </header>
    </div>
  )
}
