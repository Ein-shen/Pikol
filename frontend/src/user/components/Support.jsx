import React from 'react'
import { ArrowLeft } from 'lucide-react'
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

export const Support = () => {
  return (
    <div w-full>
      <header className="flex justify-between flex-row items-center">
        <button  >
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