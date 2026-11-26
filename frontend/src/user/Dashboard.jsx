
import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export const Dashboard = () => {
  return (
    <div className="animate-fade-in animation-delay-100 theme-card bg-fixed theme-text h-dvh w-full flex flex-col overflow-hidden">

      {/* Top Navigation (fixed) */}
      <Navbar />

      {/* Left Sidebar (fixed) */}
      <Sidebar />

      {/* Main dashboard content */}
      <main className="flex-1 min-h-0 overflow-hidden pt-24 md:ml-56 px-1 md:px-2">

        {/* Outlet wrapper */}
        <div className="h-full min-h-0 overflow-hidden p-6">
          <Outlet />
        </div>

      </main>

    </div>
  )
}
