import React from 'react'
import { LayoutDashboard, Settings, Sliders, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const Sidebar = () => {
  const navigate = useNavigate()

  return (
    <aside className='theme-card theme-text w-54 min-h-screen border-r border-black/30 py-5 px-4 flex flex-col'>
      <div className='space-y-3 w-full'>
        {/* Dashboard / Hero */}
        <button 
          onClick={() => navigate('/dashboard/hero')}
          className='w-full h-10 bg-green-100 flex items-center justify-start gap-2 px-3 font-mono text-sm rounded-md border border-black/30 hover:bg-green-200 transition-colors'
        >
          <LayoutDashboard className='w-4 h-4 shrink-0' />
          Dashboard
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/dashboard/settings')}
          className='w-full h-10 bg-green-100 flex items-center justify-start gap-2 px-3 font-mono text-sm rounded-md border border-black/30 hover:bg-green-200 transition-colors'
        >
          <Settings className='w-4 h-4 shrink-0' />
          Settings
        </button>

        {/* Matching */}
        <button 
          onClick={() => navigate('/dashboard/matching')}
          className='w-full h-10 bg-green-100 flex items-center justify-start gap-2 px-3 font-mono text-sm rounded-md border border-black/30 hover:bg-green-200 transition-colors'
        >
          <Sliders className='w-4 h-4 shrink-0' />
          Matching
        </button>

        {/* Leaderboards */}
        <button 
          onClick={() => navigate('/dashboard/leaderboard')}
          className='w-full h-10 bg-green-100 flex items-center justify-start gap-2 px-3 font-mono text-sm rounded-md border border-black/30 hover:bg-green-200 transition-colors'
        >
          <Trophy className='w-4 h-4 shrink-0' />
          Leaderboards
        </button>
      </div>
    </aside>
  )
}