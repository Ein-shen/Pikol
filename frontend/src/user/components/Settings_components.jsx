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
      path: '/dashboard/about_components',
      icon: 'https://img.icons8.com/?size=100&id=PUULuXvUfB6u&format=png&color=000000',
      alt: 'about',
    },
    {
      label: 'Support',
      path: '/dashboard/support_components ',
      icon: 'https://img.icons8.com/?size=100&id=CKanVNIbMiJO&format=png&color=000000',
      alt: 'support',
    },
     
    {
      label: 'Language',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=ceTqKjlDTFsp&format=png&color=000000',
      alt: 'language',
    },
     {
      label: 'Privacy center',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=EUM1sHPZXmLO&format=png&color=000000',
      alt: 'language',
    },
    {
      label: 'Display',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=35128&format=png&color=000000',
      alt: 'language',
    },
    
    
    {
      label: 'Activity Center',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=V8DoLg02M4Fb&format=png&color=000000',
      alt: 'language',
    },
    {
      label: 'Time Management',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=84306&format=png&color=000000',
      alt: 'language',
    },
    {
      label: 'Terms & Condition',
      path: ' ',
      icon: 'https://img.icons8.com/?size=100&id=102559&format=png&color=000000',
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

      <div className="theme-card py-6 space-y-6 theme-border  animate-fade-in animation-delay-100 border px-3 rounded-md w-[90%] mx-auto flex flex-col justify-center items-stretch">
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
              <img src={item.icon} alt={item.alt} height={15} width={25} />
              {item.label}
            </span>
            <ChevronRight size={25} />
          </button>
        ))}
      </div>
    </div>
  )
}