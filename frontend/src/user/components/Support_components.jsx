import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
const contacts = [
  {
    icon: '✉️',
    label: 'Email us',
    value: 'Shensarsale25@gmail.com',
    href: 'mailto:Shensarsale25@gmail.com',
  },
  {
    icon: '🛟',
    label: 'Support',
    value: 'Pikolleague@support.com',
    href: 'mailto:Pikolleague@support.com',
  },
]

export const Support_components = () => {
  const navigate = useNavigate()
  return (
    <div w-full>
      <header className="flex justify-between flex-row items-center">
        <button 
                  onClick={() => navigate(-1)}
                  >
                  <ArrowLeft />
              
                </button>

        <h1 className="font-bold text-lg">Support</h1>

        <button
          
          className="flex flex-row rounded-md p-2 items-center space-x-3 text-md font-bold"
        >
          
        </button>
      </header>
    </div>
  )
}