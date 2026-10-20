import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export const Dashboard = () => {
  return (
    <div className='bg-green-100 min-h-screen flex flex-col'>
      {/* Top Navigation (fixed) */}
      <Navbar />

      {/* Left Sidebar (fixed) */}
      <Sidebar />

      {/* Content: pt-24 clears the navbar, md:ml-56 clears the sidebar */}
      <main className='flex-1 pt-24 md:ml-56 px-5'>
        <div className='p-6'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}