import React from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const Settings_components = () => {
  const navigate = useNavigate()

  const handleNavigate = (path) => {
    navigate(path)
  }

  const items = [
    {
      label: 'About',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=PUULuXvUfB6u&format=png&color=000000',
      alt: 'about',
    },
    {
      label: 'Support',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=CKanVNIbMiJO&format=png&color=000000',
      alt: 'support',
    },
    {
      label: 'Ask for help',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=wYfd7Y8cWmet&format=png&color=000000',
      alt: 'help',
    },
    {
      label: 'Language',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=ceTqKjlDTFsp&format=png&color=000000',
      alt: 'language',
    },
  ]

  return (
    <div className="flex flex-col gap-10">
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

        {/* Spacer keeps the title centered */}
        <div className="w-10" />
      </header>

      <div className="theme-card py-4 space-y-4 theme-border border px-3 rounded-md w-[90%] mx-auto flex flex-col justify-center items-stretch">
        {items.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={`w-full px-6 sm:px-8 md:px-12 lg:px-5 font-mono text-md transition-colors hover:opacity-80 flex items-center justify-between ${
              index < items.length - 1 ? 'theme-border border-b pb-4' : ''
            }`}
            onClick={() => handleNavigate(item.path)}
          >
            <span className="flex flex-row items-center gap-2">
              <img src={item.icon} alt={item.alt} height={10} width={20} />
              {item.label}
            </span>
            <ChevronRight size={25} />
          </button>
        ))}
      </div>
    </div>
  )
}