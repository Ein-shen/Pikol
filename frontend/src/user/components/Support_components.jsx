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
    <div className="w-full flex flex-col gap-10">
      <header className="flex justify-between flex-row items-center">
        <button
          type="button"
          className="rounded-md p-2 opacity-60 transition hover:opacity-100"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Support</h1>

        {/* Spacer keeps the title centered */}
        <div className="w-10" />
      </header>

      <div className="theme-card theme-border border rounded-md w-[90%] mx-auto py-4 px-3 flex flex-col gap-4">
        {contacts.map((contact, index) => (
          <a
            key={contact.href}
            href={contact.href}
            className={`flex items-center gap-3 px-3 font-mono transition-colors hover:opacity-80 ${
              index < contacts.length - 1 ? 'theme-border border-b pb-4' : ''
            }`}
          >
            <span className="text-2xl" aria-hidden="true">{contact.icon}</span>
            <span className="flex flex-col">
              <span className="text-sm opacity-60">{contact.label}</span>
              <span className="text-md break-all">{contact.value}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}