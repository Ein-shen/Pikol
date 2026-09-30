import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export const Dashboard = () => {
  return (
    <div className='bg-green-100 min-h-screen flex flex-col'>
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <div className='flex flex-1 flex-row overflow-hidden'>
        {/* Left Sidebar */}
        <Sidebar />

        {/* Dynamic Nested Content */}
        <main className='flex-1 p-6 overflow-y-auto'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}